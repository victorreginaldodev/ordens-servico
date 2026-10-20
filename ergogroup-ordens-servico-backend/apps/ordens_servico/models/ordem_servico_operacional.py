from django.db import models
from django.conf import settings
from django.utils import timezone

from apps.ordens_servico.models.ordem_servico import Prioridade


class StatusOrdemServicoOperacional(models.TextChoices):
    NAO_INICIADO = 'nao_iniciado', 'Não Iniciado'
    EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
    FINALIZADA = 'finalizada', 'Finalizada'


class RegraDeCobranca(models.TextChoices):
    """De onde vem a decisão de cobrar a OSO (ADR 0011, revisão de 20/10/2026)."""
    # As OSOs que já existiam quando a regra do catálogo entrou: a cobrança é a que estava gravada (no legado, a
    # "Revisão do cliente" marcada pelo técnico) e não muda mais, nem quando o catálogo muda.
    LEGADO = 'legado', 'Anterior à regra do catálogo'
    # As criadas depois: a cobrança segue sempre a regra do catálogo e dos clientes isentos, até serem faturadas.
    CATALOGO = 'catalogo', 'Regra do catálogo'


class OrdemServicoOperacional(models.Model):
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='ordens_servico_operacionais',
    )
    catalogo_operacional = models.ForeignKey(
        'catalogo.CatalogoOperacional',
        on_delete=models.PROTECT,
        related_name='ordens_servico_operacionais',
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='ordens_servico_operacionais',
    )
    quantidade = models.PositiveIntegerField(default=1)
    descricao = models.TextField(null=True, blank=True)
    prioridade = models.CharField(max_length=10, choices=Prioridade.choices, default=Prioridade.BAIXA)
    prazo = models.DateField(null=True, blank=True)
    data_recebimento = models.DateField(null=True, blank=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_termino = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=StatusOrdemServicoOperacional.choices, default=StatusOrdemServicoOperacional.NAO_INICIADO)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    # Só histórico do sistema anterior: não é editável e não decide a cobrança.
    revisao_cliente = models.BooleanField(default=False)
    gera_cobranca = models.BooleanField(default=False)
    regra_de_cobranca = models.CharField(
        max_length=10, choices=RegraDeCobranca.choices, default=RegraDeCobranca.CATALOGO,
        help_text='De onde vem a decisão de cobrar: a regra do catálogo ou a anterior a ela (congelada).',
    )
    data_liberacao_cobranca = models.DateTimeField(null=True, blank=True)
    liberada_cobranca_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_servico_operacionais_liberadas_cobranca',
    )
    cobranca_realizada = models.BooleanField(default=False)
    numero_nf = models.CharField(max_length=10, null=True, blank=True)
    # Lançamento no sistema financeiro externo, como nas vendas (19/10/2026).
    referencia_lancamento = models.CharField(max_length=100, null=True, blank=True)
    data_cobranca = models.DateField(null=True, blank=True)
    cobranca_realizada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_servico_operacionais_cobranca_realizada',
    )

    class Meta:
        ordering = ['-data_recebimento']
        verbose_name = 'Ordem de Serviço Operacional'
        verbose_name_plural = 'Ordens de Serviço Operacionais'

    def __str__(self):
        return f'OSO #{self.pk} — {self.catalogo_operacional} ({self.cliente})'

    def clean(self):
        super().clean()

    def save(self, *args, **kwargs):
        # Regra do catálogo (as criadas desde 20/10/2026): segue o catálogo e os clientes isentos até ser faturada.
        # Anterior à regra do catálogo: a cobrança gravada não muda. `revisao_cliente` nunca entra na decisão.
        if (
            self.regra_de_cobranca == RegraDeCobranca.CATALOGO and not self.cobranca_realizada
            and self.catalogo_operacional_id and self.cliente_id
        ):
            self.gera_cobranca = self.catalogo_operacional.gera_cobranca_para(self.cliente_id)
        if self.gera_cobranca and self.status == StatusOrdemServicoOperacional.FINALIZADA:
            if self.data_liberacao_cobranca is None:
                self.data_liberacao_cobranca = timezone.now()
            if self.liberada_cobranca_por_id is None:
                self.liberada_cobranca_por = self.responsavel
        if not self.gera_cobranca:
            self.data_liberacao_cobranca = None
            self.liberada_cobranca_por = None
        super().save(*args, **kwargs)
