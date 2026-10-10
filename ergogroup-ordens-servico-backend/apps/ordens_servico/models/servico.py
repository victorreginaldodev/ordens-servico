from django.db import models
from django.conf import settings
from django.utils import timezone

from apps.ordens_servico.models.ordem_servico import Prioridade


class MotivoCiencia(models.TextChoices):
    CLIENTE = 'cliente', 'Aguardando o cliente'
    DOCUMENTACAO = 'documentacao', 'Aguardando documentação'
    AGENDAMENTO = 'agendamento', 'Aguardando agendamento'
    TERCEIRO = 'terceiro', 'Aguardando terceiro'
    OUTRO = 'outro', 'Outro'


class StatusServico(models.TextChoices):
    ABERTO = 'aberto', 'Aberto'
    EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
    CONCLUIDA = 'concluida', 'Concluído'
    CANCELADO = 'cancelado', 'Cancelado'


class Servico(models.Model):
    ordem_servico = models.ForeignKey(
        'ordens_servico.OrdemServico',
        on_delete=models.CASCADE,
        related_name='servicos',
    )
    catalogo = models.ForeignKey(
        'catalogo.Catalogo',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    # Cópia do setor do catálogo no momento em que o serviço recebe o catálogo.
    # Mudar o catálogo de setor depois não move o histórico de serviços.
    setor = models.ForeignKey(
        'organizacoes.Setor',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='servicos',
    )
    descricao = models.TextField()
    status = models.CharField(max_length=15, choices=StatusServico.choices, default=StatusServico.ABERTO)
    prioridade = models.CharField(max_length=10, choices=Prioridade.choices, default=Prioridade.BAIXA)
    # Calculado: a maior data entre os prazos das tarefas não canceladas (ADR 0006, 5.1).
    prazo = models.DateField(null=True, blank=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_termino = models.DateField(null=True, blank=True)
    data_conclusao = models.DateField(null=True, blank=True)
    terminado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='servicos_terminados',
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    # Alerta de serviço sem movimentação (ADR 0008, 3). A movimentação é atualizada pelo sistema; a ciência
    # é o "estou ciente, deixar assim" de quem acompanha o serviço e silencia o alerta por mais um período.
    ultima_movimentacao_em = models.DateTimeField(default=timezone.now)
    alerta_ciente_em = models.DateTimeField(null=True, blank=True)
    alerta_ciente_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ciencias_de_alerta',
    )
    alerta_ciente_motivo = models.CharField(max_length=15, choices=MotivoCiencia.choices, null=True, blank=True)
    alerta_ciente_observacao = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['ordem_servico', 'status']
        verbose_name = 'Serviço'
        verbose_name_plural = 'Serviços'

    def __str__(self):
        return f'Serviço #{self.pk} — OS #{self.ordem_servico_id}'

    @property
    def ativo(self):
        return self.status in (StatusServico.ABERTO, StatusServico.EM_ANDAMENTO)

    @property
    def referencia_do_alerta(self):
        """A mais recente entre a última movimentação e a última ciência."""
        if self.alerta_ciente_em and self.alerta_ciente_em > self.ultima_movimentacao_em:
            return self.alerta_ciente_em
        return self.ultima_movimentacao_em

    @property
    def dias_sem_movimentacao(self):
        return (timezone.localdate() - timezone.localtime(self.ultima_movimentacao_em).date()).days

    @property
    def em_alerta_sem_movimentacao(self):
        if not self.ativo:
            return False
        dias = (timezone.localdate() - timezone.localtime(self.referencia_do_alerta).date()).days
        return dias >= settings.DIAS_ALERTA_SEM_MOVIMENTACAO

    @property
    def ciencia_vigente(self):
        """A ciência só vale enquanto nada se moveu depois dela."""
        return bool(self.alerta_ciente_em and self.alerta_ciente_em >= self.ultima_movimentacao_em)

    def registrar_movimentacao(self):
        agora = timezone.now()
        Servico.objects.filter(pk=self.pk).update(ultima_movimentacao_em=agora)
        self.ultima_movimentacao_em = agora

    def registrar_ciencia(self, por, motivo=None, observacao=None):
        """Registra o "estou ciente, deixar assim": silencia o alerta por mais um período. Fica na auditoria."""
        from apps.auditoria.models import AcaoAuditoria
        from apps.auditoria.utils import registrar_update_direto

        updates = {
            'alerta_ciente_em': timezone.now(),
            'alerta_ciente_por_id': getattr(por, 'pk', por),
            'alerta_ciente_motivo': motivo or None,
            'alerta_ciente_observacao': observacao or None,
        }
        registrar_update_direto(
            self, updates, acao=AcaoAuditoria.CIENCIA_ALERTA, motivo='Ciência do alerta de serviço sem movimentação.',
        )
        Servico.objects.filter(pk=self.pk).update(**updates)
        for campo, valor in updates.items():
            setattr(self, campo, valor)

    def save(self, *args, **kwargs):
        self.definir_setor_pelo_catalogo()
        super().save(*args, **kwargs)
        self.sincronizar_status_e_rastreio()

    def definir_setor_pelo_catalogo(self):
        if self.pk is not None:
            catalogo_anterior_id = (
                Servico.objects.filter(pk=self.pk).values_list('catalogo_id', flat=True).first()
            )
            if catalogo_anterior_id == self.catalogo_id:
                return
        self.setor_id = self.catalogo.setor_id if self.catalogo_id else None

    def sincronizar_status(self):
        return self.sincronizar_status_e_rastreio()

    def sincronizar_status_e_rastreio(self):
        tem_tarefas = self.tarefas.exists()
        updates = {}

        if self.status == StatusServico.CANCELADO:
            self.ordem_servico.sincronizar_status_e_cobranca()
            return self.status

        prazo = (
            self.tarefas.exclude(status='cancelada').aggregate(maior=models.Max('prazo'))['maior']
            if tem_tarefas else None
        )
        if self.prazo != prazo:
            updates['prazo'] = prazo

        if tem_tarefas:
            tarefas = self.tarefas.all()
            primeira_data_inicio = (
                tarefas
                .filter(data_inicio__isnull=False)
                .order_by('data_inicio', 'id')
                .values_list('data_inicio', flat=True)
                .first()
            )
            ultima_tarefa_concluida = (
                tarefas
                .filter(status='concluida')
                .order_by('-data_termino', '-atualizado_em', '-id')
                .first()
            )
            todos_concluidos = not tarefas.exclude(status='concluida').exists()
            tem_execucao = tarefas.filter(status__in=['em_andamento', 'concluida']).exists()

            if self.data_inicio != primeira_data_inicio:
                updates['data_inicio'] = primeira_data_inicio

            if todos_concluidos:
                if self.status != StatusServico.CONCLUIDA:
                    updates['status'] = StatusServico.CONCLUIDA
                data_termino = (
                    ultima_tarefa_concluida.data_termino
                    if ultima_tarefa_concluida and ultima_tarefa_concluida.data_termino
                    else timezone.localdate()
                )
                terminado_por_id = (
                    ultima_tarefa_concluida.responsavel_id
                    if ultima_tarefa_concluida
                    else None
                )
                if self.data_termino != data_termino:
                    updates['data_termino'] = data_termino
                if self.data_conclusao != data_termino:
                    updates['data_conclusao'] = data_termino
                if self.terminado_por_id != terminado_por_id:
                    updates['terminado_por_id'] = terminado_por_id
            else:
                novo_status = StatusServico.EM_ANDAMENTO if tem_execucao else StatusServico.ABERTO
                if self.status != novo_status:
                    updates['status'] = novo_status
                if self.data_termino is not None:
                    updates['data_termino'] = None
                if self.data_conclusao is not None:
                    updates['data_conclusao'] = None
                if self.terminado_por_id is not None:
                    updates['terminado_por_id'] = None
        else:
            if self.status != StatusServico.ABERTO:
                updates['status'] = StatusServico.ABERTO
            if self.data_inicio is not None:
                updates['data_inicio'] = None
            if self.data_termino is not None:
                updates['data_termino'] = None
            if self.data_conclusao is not None:
                updates['data_conclusao'] = None
            if self.terminado_por_id is not None:
                updates['terminado_por_id'] = None

        if updates:
            from apps.auditoria.models import AcaoAuditoria
            from apps.auditoria.utils import registrar_update_direto

            registrar_update_direto(
                self,
                updates,
                acao=AcaoAuditoria.PROPAGACAO_STATUS,
                motivo='Serviço sincronizado automaticamente a partir das tarefas.',
            )
            updates['atualizado_em'] = timezone.now()
            Servico.objects.filter(pk=self.pk).update(**updates)
            for campo, valor in updates.items():
                setattr(self, campo, valor)

        self.ordem_servico.sincronizar_status_e_cobranca()
        return self.status
