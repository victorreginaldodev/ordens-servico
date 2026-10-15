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
    """O recorrente saiu em 13/10/2026: um contrato mensal é registrado como parcelado (ex.: 24x)."""
    A_VISTA = 'a_vista', 'À vista'
    PARCELADO = 'parcelado', 'Parcelado'

class LiberarEm(models.TextChoices):
    VENDA = 'venda', 'Na venda'
    CONCLUSAO = 'conclusao', 'Na conclusão dos serviços'

class OrigemLancamento(models.TextChoices):
    MANUAL = 'manual', 'Manual'
    INTEGRACAO = 'integracao', 'Integração'

DIAS_APOS_NOTA = [MinValueValidator(1), MaxValueValidator(365)]
DIA_DO_MES = [MinValueValidator(1), MaxValueValidator(31)]


def validar_condicao_pagamento(
    tipo_condicao, quantidade_parcelas, data_acordada_cobranca, vencimento_dias_apos_nota, exigir_vencimento=False,
    dia_vencimento_demais=None,
):
    """Regras da condição de pagamento (ADR 0007, revisão de 13/10/2026). Devolve ``{campo: mensagem}``; vazio se
    válida. O vencimento (no parcelado, o da 1ª parcela) é uma data combinada **ou** um número de dias após a
    emissão da nota, nunca os dois. É obrigatório no parcelado e, com ``exigir_vencimento``, também no à vista
    (vendas novas e edições da condição; as vendas antigas sem vencimento continuam válidas).
    ``dia_vencimento_demais`` (dia das parcelas da 2ª em diante, 1 a 31) só existe no parcelado."""
    erros = {}
    parcelado = tipo_condicao == TipoCondicao.PARCELADO
    if parcelado and (not quantidade_parcelas or quantidade_parcelas < 2):
        erros['quantidade_parcelas'] = 'O parcelado precisa de pelo menos 2 parcelas.'
    if data_acordada_cobranca and vencimento_dias_apos_nota:
        erros['vencimento_dias_apos_nota'] = 'Informe a data do vencimento ou os dias após a nota, não os dois.'
    elif vencimento_dias_apos_nota is not None and not 1 <= vencimento_dias_apos_nota <= 365:
        erros['vencimento_dias_apos_nota'] = 'Use de 1 a 365 dias após a nota.'
    elif (parcelado or exigir_vencimento) and not data_acordada_cobranca and not vencimento_dias_apos_nota:
        erros['data_acordada_cobranca'] = (
            'Informe quando vence a 1ª parcela: a data combinada ou quantos dias após a nota.' if parcelado
            else 'Informe quando vence: a data combinada ou quantos dias após a nota.'
        )
    if dia_vencimento_demais is not None:
        if not parcelado:
            erros['dia_vencimento_demais'] = 'O dia das demais parcelas só existe no parcelado.'
        elif not 1 <= dia_vencimento_demais <= 31:
            erros['dia_vencimento_demais'] = 'Use um dia entre 1 e 31.'
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
    tipo_condicao = models.CharField(max_length=10, choices=TipoCondicao.choices, default=TipoCondicao.A_VISTA)
    forma_pagamento = models.CharField(max_length=15, choices=FormaPagamento.choices, default=FormaPagamento.BOLETO)
    # Parcelado: número de parcelas, sempre mensais, no mesmo dia do mês da 1ª.
    quantidade_parcelas = models.IntegerField(null=True, blank=True)
    # Vencimento (no parcelado, o da 1ª parcela): a data combinada OU quantos dias depois da emissão da nota.
    data_acordada_cobranca = models.DateField(null=True, blank=True)
    vencimento_dias_apos_nota = models.PositiveSmallIntegerField(null=True, blank=True, validators=DIAS_APOS_NOTA)
    # Parcelado: dia do mês das parcelas da 2ª em diante. Vazio = no mesmo dia do mês da 1ª. A 2ª vence no mês
    # seguinte ao da 1ª, e um dia que não existe no mês (ex.: 31) vira o último dia (faturamento/03, seção 8.3).
    dia_vencimento_demais = models.PositiveSmallIntegerField(null=True, blank=True, validators=DIA_DO_MES)
    liberar_em = models.CharField(max_length=10, choices=LiberarEm.choices, default=LiberarEm.CONCLUSAO)
    nome_contato_envio_nf = models.CharField(max_length=50, default='')
    contato_envio_nf = models.EmailField(default='')
    # Observações de pagamento e faturamento (é o uso real do campo). Só para quem vê valores.
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
            self.tipo_condicao, self.quantidade_parcelas, self.data_acordada_cobranca, self.vencimento_dias_apos_nota,
            dia_vencimento_demais=self.dia_vencimento_demais,
        )
        if erros:
            raise ValidationError(erros)

    def save(self, *args, **kwargs):
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
            # Serviço cancelado não conta: a OS conclui (e libera, se for na conclusão) quando os demais terminam,
            # e fica cancelada quando todos foram cancelados (decidido em 13/10/2026, faturamento/03).
            ativos = servicos.exclude(status='cancelado')
            todos_cancelados = tem_servicos and not ativos.exists()
            todos_concluidos = ativos.exists() and not ativos.exclude(status='concluida').exists()
            tem_execucao = ativos.filter(status__in=['em_andamento', 'concluida']).exists()

            if todos_cancelados:
                novo_status = Status.CANCELADA
            elif todos_concluidos:
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
    def vencimento_resumo(self):
        """Ex.: "10/08/2026" ou "21 dias após a nota"; None sem vencimento."""
        if self.data_acordada_cobranca:
            return formatar_data(self.data_acordada_cobranca)
        if self.vencimento_dias_apos_nota:
            dias = self.vencimento_dias_apos_nota
            return f'{dias} dia{"s" if dias > 1 else ""} após a nota'
        return None

    @property
    def condicao_resumo(self):
        """Texto pronto da condição de pagamento, o mesmo no comercial, no financeiro e nos e-mails
        (ADR 0008, 6). Ex.: "Parcelado em 6x de R$ 1.583,33 (mensais), 1ª parcela 10/08/2026" ou
        "…, 1ª parcela 21 dias após a nota, demais todo dia 10"."""
        vencimento = self.vencimento_resumo
        if self.tipo_condicao == TipoCondicao.PARCELADO:
            n = self.quantidade_parcelas
            texto = f'Parcelado em {n or "?"}x'
            if n and self.valor:
                texto += f' de {formatar_reais(self.valor / n)}'
            texto += ' (mensais)'
            if vencimento:
                texto += f', 1ª parcela {vencimento}'
            if self.dia_vencimento_demais:
                texto += f', demais todo dia {self.dia_vencimento_demais}'
            return texto
        if self.tipo_condicao == TipoCondicao.A_VISTA:
            return f'À vista, vence {vencimento}' if vencimento else 'À vista'
        # Registros antigos da auditoria (o recorrente saiu em 13/10/2026).
        return 'Recorrente (condição antiga)'

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
        from apps.ordens_servico.emails import ator_atual, notificar_liberacao_cobranca, resumo_da_execucao

        por = ator_atual()
        transaction.on_commit(lambda: notificar_liberacao_cobranca(
            self, tipo='OS', valor=self.valor, por=por, execucao=resumo_da_execucao(self),
        ))

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
