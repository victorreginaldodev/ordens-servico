from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone
from datetime import datetime, time

class FormaPagamento(models.TextChoices):
    PIX = 'pix', 'PIX'
    CREDITO = 'credito', 'Crédito'
    DEBITO = 'debito', 'Débito'
    BOLETO = 'boleto', 'Boleto'
    TRANSFERENCIA = 'transferencia', 'Transferência'
    DINHEIRO = 'dinheiro', 'Dinheiro'
    CHEQUE = 'cheque', 'Cheque'
    OUTRO = 'outro', 'Outro'

class TipoCondicao(models.TextChoices):
    A_VISTA = 'a_vista', 'À vista'
    PARCELADO = 'parcelado', 'Parcelado'
    RECORRENTE = 'recorrente', 'Recorrente'

class LiberarEm(models.TextChoices):
    VENDA = 'venda', 'Na venda'
    CONCLUSAO = 'conclusao', 'Na conclusão dos serviços'

class OrigemLancamento(models.TextChoices):
    MANUAL = 'manual', 'Manual'
    INTEGRACAO = 'integracao', 'Integração'

INTERVALO_PARCELAS_PADRAO_DIAS = 30
DIA_DO_MES = [MinValueValidator(1), MaxValueValidator(31)]


def validar_condicao_pagamento(
    tipo_condicao, quantidade_parcelas, data_acordada_cobranca, dia_vencimento, valor_mensal=None,
):
    """Regras da condição de pagamento por tipo (ADRs 0007 e 0008). Devolve ``{campo: mensagem}``; vazio se
    válida. No recorrente, ``quantidade_parcelas`` é o número de meses."""
    erros = {}
    if tipo_condicao == TipoCondicao.PARCELADO:
        if not quantidade_parcelas or quantidade_parcelas < 2:
            erros['quantidade_parcelas'] = 'O parcelado precisa de pelo menos 2 parcelas.'
        if not data_acordada_cobranca:
            erros['data_acordada_cobranca'] = 'Informe o primeiro vencimento.'
    elif tipo_condicao == TipoCondicao.RECORRENTE:
        if not quantidade_parcelas or quantidade_parcelas < 1:
            erros['quantidade_parcelas'] = 'Informe o número de meses do recorrente.'
        if not dia_vencimento:
            erros['dia_vencimento'] = 'Informe o dia de vencimento do recorrente.'
        if not valor_mensal:
            erros['valor_mensal'] = 'Informe o valor mensal do recorrente.'
    return erros

def formatar_reais(valor):
    """R$ 1.500,00"""
    texto = f'{valor:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')
    return f'R$ {texto}'


def formatar_data(data):
    return data.strftime('%d/%m/%Y')


class Prioridade(models.TextChoices):
    BAIXA = 'baixa', 'Baixa'
    MEDIA = 'media', 'Média'
    ALTA = 'alta', 'Alta'

class Status(models.TextChoices):
    ABERTA = 'aberta', 'Aberta'
    EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
    CONCLUIDA = 'concluida', 'Concluída'
    CANCELADA = 'cancelada', 'Cancelada'

class OrdemServico(models.Model):
    cliente = models.ForeignKey('clientes.Cliente',on_delete=models.PROTECT, related_name='ordens_servico')
    data_venda = models.DateField()
    concluida = models.BooleanField(default=False)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ABERTA)
    prioridade = models.CharField(max_length=10, choices=Prioridade.choices, default=Prioridade.BAIXA)
    prazo = models.DateField(null=True, blank=True)

    # Condições de pagamento combinadas na venda (ADR 0007). O sistema registra, não controla parcelas.
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Recorrente: valor de cada mês. O valor total continua em `valor`; um não é calculado do outro.
    valor_mensal = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tipo_condicao = models.CharField(max_length=10, choices=TipoCondicao.choices, default=TipoCondicao.A_VISTA)
    forma_pagamento = models.CharField(max_length=15, choices=FormaPagamento.choices, default=FormaPagamento.BOLETO)
    # Parcelado: número de parcelas. Recorrente: número de meses.
    quantidade_parcelas = models.IntegerField(null=True, blank=True)
    # Primeiro vencimento.
    data_acordada_cobranca = models.DateField(null=True, blank=True)
    intervalo_parcelas_dias = models.PositiveSmallIntegerField(null=True, blank=True)
    dia_fechamento = models.PositiveSmallIntegerField(null=True, blank=True, validators=DIA_DO_MES)
    dia_vencimento = models.PositiveSmallIntegerField(null=True, blank=True, validators=DIA_DO_MES)
    liberar_em = models.CharField(max_length=10, choices=LiberarEm.choices, default=LiberarEm.CONCLUSAO)
    nome_contato_envio_nf = models.CharField(max_length=50, default='')
    contato_envio_nf = models.EmailField(default='')
    observacao = models.TextField(null=True, blank=True)

    liberada_para_cobranca = models.BooleanField(default=False)
    liberada_para_cobranca_em = models.DateTimeField(null=True, blank=True)
    liberada_para_cobranca_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_liberadas_para_cobranca',
    )
    # Lançamento ("check") do financeiro no sistema externo. Nome provisório (ADR 0007).
    cobranca_realizada = models.BooleanField(default=False)
    referencia_lancamento = models.CharField(max_length=100, null=True, blank=True)
    origem_lancamento = models.CharField(max_length=10, choices=OrigemLancamento.choices, null=True, blank=True)
    data_cobranca = models.DateField(null=True, blank=True)
    cobranca_realizada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_cobranca_realizada',
    )

    # Aditoria
    criada_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_criadas',
    )
    data_atualizacao = models.DateTimeField(auto_now=True)
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_atualizadas',
    )

    class Meta:
        ordering = ['-data_venda']
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'

    def clean(self):
        super().clean()
        erros = validar_condicao_pagamento(
            self.tipo_condicao, self.quantidade_parcelas, self.data_acordada_cobranca, self.dia_vencimento,
            self.valor_mensal,
        )
        if erros:
            raise ValidationError(erros)

    def save(self, *args, **kwargs):
        if self.tipo_condicao == TipoCondicao.PARCELADO and self.intervalo_parcelas_dias is None:
            self.intervalo_parcelas_dias = INTERVALO_PARCELAS_PADRAO_DIAS
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                kwargs['update_fields'] = {*update_fields, 'intervalo_parcelas_dias'}
        liberando_na_criacao = self.pk is None and self.liberar_em == LiberarEm.VENDA
        if liberando_na_criacao:
            self.liberada_para_cobranca = True
            if self.liberada_para_cobranca_em is None:
                self.liberada_para_cobranca_em = timezone.now()
            if self.liberada_para_cobranca_por_id is None:
                self.liberada_para_cobranca_por = self.criado_por
        super().save(*args, **kwargs)

        if liberando_na_criacao:
            self._notificar_liberacao_para_cobranca()

    def atualizar_status_conclusao(self):
        return self.sincronizar_status_e_cobranca()

    def calcular_liberada_para_cobranca(self):
        return self.liberada_para_cobranca

    def sincronizar_status_e_cobranca(self):
        servicos = self.servicos.all()
        tem_servicos = servicos.exists()
        updates = {}

        if self.status != Status.CANCELADA:
            todos_concluidos = tem_servicos and not servicos.exclude(status='concluida').exists()
            tem_execucao = servicos.filter(status__in=['em_andamento', 'concluida']).exists()

            if todos_concluidos:
                novo_status = Status.CONCLUIDA
            elif tem_execucao:
                novo_status = Status.EM_ANDAMENTO
            else:
                novo_status = Status.ABERTA

            nova_conclusao = novo_status == Status.CONCLUIDA

            if self.status != novo_status:
                updates['status'] = novo_status
            if self.concluida != nova_conclusao:
                updates['concluida'] = nova_conclusao

        if not self.liberada_para_cobranca:
            if self.liberar_em == LiberarEm.VENDA:
                updates['liberada_para_cobranca'] = True
                updates['liberada_para_cobranca_em'] = timezone.now()
                updates['liberada_para_cobranca_por_id'] = self.criado_por_id
            elif updates.get('status', self.status) == Status.CONCLUIDA:
                ultimo_servico = (
                    servicos
                    .filter(status='concluida')
                    .order_by('-data_termino', '-data_conclusao', '-id')
                    .first()
                )
                if ultimo_servico:
                    data_liberacao = ultimo_servico.data_termino or ultimo_servico.data_conclusao
                    updates['liberada_para_cobranca'] = True
                    updates['liberada_para_cobranca_em'] = (
                        _as_datetime(data_liberacao) if data_liberacao else timezone.now()
                    )
                    updates['liberada_para_cobranca_por_id'] = ultimo_servico.terminado_por_id

        if updates:
            from apps.auditoria.utils import registrar_update_direto

            registrar_update_direto(
                self,
                updates,
                acao=_acao_auditoria_updates_os(updates),
                motivo='Ordem de Serviço sincronizada automaticamente a partir dos serviços.',
            )
            updates['data_atualizacao'] = timezone.now()
            OrdemServico.objects.filter(pk=self.pk).update(**updates)
            for campo, valor in updates.items():
                setattr(self, campo, valor)

            if updates.get('liberada_para_cobranca'):
                self._notificar_liberacao_para_cobranca()

        return self.concluida

    @property
    def condicao_resumo(self):
        """Texto pronto da condição de pagamento, o mesmo no comercial, no financeiro e nos e-mails
        (ADR 0008, 6). Ex.: "Parcelado em 6x a cada 30 dias, 1º vencimento 10/08/2026"."""
        partes = []
        if self.tipo_condicao == TipoCondicao.PARCELADO:
            texto = f'Parcelado em {self.quantidade_parcelas or "?"}x'
            if self.intervalo_parcelas_dias:
                texto += f' a cada {self.intervalo_parcelas_dias} dias'
            partes.append(texto)
        elif self.tipo_condicao == TipoCondicao.RECORRENTE:
            texto = f'Recorrente: {self.quantidade_parcelas or "?"} meses'
            if self.valor_mensal is not None:
                texto += f' de {formatar_reais(self.valor_mensal)}'
            partes.append(texto)
            if self.dia_fechamento:
                partes.append(f'fecha dia {self.dia_fechamento}')
            if self.dia_vencimento:
                partes.append(f'vence dia {self.dia_vencimento}')
        else:
            partes.append('À vista')
        if self.data_acordada_cobranca:
            partes.append(f'1º vencimento {formatar_data(self.data_acordada_cobranca)}')
        return ', '.join(partes)

    def registrar_lancamento(self, referencia, data, por, origem=OrigemLancamento.MANUAL):
        """Guarda o "check" do financeiro: a OS foi lançada no sistema externo. Exige a OS liberada."""
        if not self.liberada_para_cobranca:
            raise ValidationError('Ordem de serviço não está liberada para cobrança.')
        self.cobranca_realizada = True
        self.referencia_lancamento = referencia or None
        self.origem_lancamento = origem
        self.data_cobranca = data
        self.cobranca_realizada_por = por
        self.save(update_fields=[
            'cobranca_realizada', 'referencia_lancamento', 'origem_lancamento', 'data_cobranca',
            'cobranca_realizada_por', 'data_atualizacao',
        ])

    def _notificar_liberacao_para_cobranca(self):
        from apps.ordens_servico.emails import notificar_liberacao_cobranca

        transaction.on_commit(
            lambda: notificar_liberacao_cobranca(self, tipo='OS', valor=self.valor)
        )

    @property
    def dias_em_aberto(self):
        if self.status == Status.CONCLUIDA:
            return None

        data_base = self.criada_em.date() if self.criada_em else self.data_venda
        return (timezone.now().date() - data_base).days


    @property
    def dias_entre_criacao_e_conclusao(self):
        if not self.liberada_para_cobranca_em:
            return None

        data_inicio = self.criada_em.date()
        data_fim = self.liberada_para_cobranca_em.date()

        return (data_fim - data_inicio).days + 1


    def __str__(self):
        return f'OS #{self.pk} — {self.cliente}'


def _as_datetime(value):
    dt = datetime.combine(value, time.min)
    return timezone.make_aware(dt, timezone.get_current_timezone())


def _acao_auditoria_updates_os(updates):
    from apps.auditoria.models import AcaoAuditoria

    if 'liberada_para_cobranca' in updates:
        return AcaoAuditoria.LIBERACAO_COBRANCA
    return AcaoAuditoria.PROPAGACAO_STATUS
