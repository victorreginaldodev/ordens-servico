from django.db import models
from django.conf import settings
from django.utils import timezone

from apps.catalogo.models.catalogo import Complexidade
from apps.ordens_servico.models.ordem_servico import Prioridade


class StatusOrdemServicoOperacional(models.TextChoices):
    NAO_INICIADO = 'nao_iniciado', 'Não Iniciado'
    EM_ANDAMENTO = 'em_andamento', 'Em Andamento'
    FINALIZADA = 'finalizada', 'Finalizada'


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
    horas_estimadas = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    complexidade = models.PositiveSmallIntegerField(choices=Complexidade.choices, null=True, blank=True)
    data_recebimento = models.DateField(null=True, blank=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_termino = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=StatusOrdemServicoOperacional.choices, default=StatusOrdemServicoOperacional.NAO_INICIADO)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    revisao_cliente = models.BooleanField(default=False)
    gera_cobranca = models.BooleanField(default=False)
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

    @property
    def horas_estimadas_efetivas(self):
        if self.horas_estimadas is not None:
            return self.horas_estimadas
        return self.catalogo_operacional.horas_estimadas

    @property
    def complexidade_efetiva(self):
        if self.complexidade is not None:
            return self.complexidade
        return self.catalogo_operacional.complexidade

    def clean(self):
        super().clean()
        self.gera_cobranca = self.revisao_cliente

    def save(self, *args, **kwargs):
        self.gera_cobranca = self.revisao_cliente
        if self.gera_cobranca and self.status == StatusOrdemServicoOperacional.FINALIZADA:
            if self.data_liberacao_cobranca is None:
                self.data_liberacao_cobranca = timezone.now()
            if self.liberada_cobranca_por_id is None:
                self.liberada_cobranca_por = self.responsavel
        if not self.gera_cobranca:
            self.data_liberacao_cobranca = None
            self.liberada_cobranca_por = None
        super().save(*args, **kwargs)
