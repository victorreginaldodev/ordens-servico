from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.ordens_servico.models.ordem_servico import Prioridade


class StatusTarefa(models.TextChoices):
    ABERTA = 'aberta', 'Aberta'
    EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
    CONCLUIDA = 'concluida', 'Concluída'
    CANCELADA = 'cancelada', 'Cancelada'


def validar_responsavel_no_setor(servico, responsavel):
    """Só quem pertence ao setor do serviço recebe tarefas dele (ADR 0008, 2). Serviço sem setor (legado,
    sem catálogo) não tem a restrição."""
    setor = servico.setor if servico is not None else None
    if setor is None or responsavel is None:
        return
    if not setor.tem_membro(responsavel):
        nome = responsavel.nome_completo or responsavel.email
        raise ValidationError({'responsavel': f'{nome} não pertence ao setor "{setor}".'})


class Tarefa(models.Model):
    servico = models.ForeignKey(
        'ordens_servico.Servico',
        on_delete=models.CASCADE,
        related_name='tarefas',
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='tarefas',
    )
    descricao = models.TextField(null=True, blank=True)
    prioridade = models.CharField(max_length=10, choices=Prioridade.choices, default=Prioridade.BAIXA)
    prazo = models.DateField(null=True, blank=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_termino = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=StatusTarefa.choices, default=StatusTarefa.ABERTA)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['servico', 'status']
        verbose_name = 'Tarefa'
        verbose_name_plural = 'Tarefas'

    def __str__(self):
        return f'Tarefa #{self.pk} — {self.responsavel}'

    # Mudanças que contam como movimentação do serviço (ADR 0008, 3). Corrigir a descrição não conta.
    CAMPOS_DE_MOVIMENTACAO = ('status', 'responsavel_id', 'prazo', 'servico_id')

    def clean(self):
        super().clean()
        # Vale para atribuições novas: tarefas antigas com responsável de fora do setor continuam válidas.
        if self.pk:
            anterior = Tarefa.objects.filter(pk=self.pk).values('responsavel_id', 'servico_id').first()
            if anterior == {'responsavel_id': self.responsavel_id, 'servico_id': self.servico_id}:
                return
        validar_responsavel_no_setor(self.servico if self.servico_id else None, self.responsavel)

    def save(self, *args, **kwargs):
        from apps.ordens_servico.models import Servico

        hoje = timezone.localdate()
        if self.status in (StatusTarefa.EM_ANDAMENTO, StatusTarefa.CONCLUIDA) and self.data_inicio is None:
            self.data_inicio = hoje
        if self.status == StatusTarefa.CONCLUIDA and self.data_termino is None:
            self.data_termino = hoje
        if self.status != StatusTarefa.CONCLUIDA and self.data_termino is not None:
            self.data_termino = None

        anterior = None
        if self.pk:
            anterior = Tarefa.objects.filter(pk=self.pk).values(*self.CAMPOS_DE_MOVIMENTACAO).first()
        servico_anterior_id = anterior['servico_id'] if anterior else None
        movimentou = anterior is None or any(
            anterior[campo] != getattr(self, campo) for campo in self.CAMPOS_DE_MOVIMENTACAO
        )

        super().save(*args, **kwargs)

        if servico_anterior_id and servico_anterior_id != self.servico_id:
            servico_anterior = Servico.objects.filter(pk=servico_anterior_id).first()
            if servico_anterior:
                servico_anterior.registrar_movimentacao()
                servico_anterior.sincronizar_status_e_rastreio()

        if movimentou:
            self.servico.registrar_movimentacao()
        self.servico.sincronizar_status_e_rastreio()

    def delete(self, *args, **kwargs):
        servico = self.servico
        super().delete(*args, **kwargs)
        servico.registrar_movimentacao()
        servico.sincronizar_status_e_rastreio()
