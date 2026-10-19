from django.db import models

from apps.catalogo.models.catalogo import Complexidade


class CatalogoOperacional(models.Model):
    """Catálogo de serviços disponíveis para Ordens de Serviço Operacionais."""
    nome = models.CharField(max_length=50)
    descricao = models.TextField(null=True, blank=True)
    horas_estimadas = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    complexidade = models.PositiveSmallIntegerField(choices=Complexidade.choices, null=True, blank=True)
    gera_cobranca = models.BooleanField(
        default=False,
        help_text='Indica se novas OS operacionais deste serviço geram cobrança por padrão.',
    )
    clientes_isentos_cobranca = models.ManyToManyField(
        'clientes.Cliente',
        blank=True,
        related_name='catalogos_operacionais_isentos_cobranca',
        help_text='Clientes que não geram cobrança para este serviço, mesmo quando a regra padrão cobra.',
    )

    class Meta:
        ordering = ['nome']
        verbose_name = 'Catálogo Operacional'
        verbose_name_plural = 'Catálogos Operacionais'

    def __str__(self):
        return self.nome

    def gera_cobranca_para(self, cliente) -> bool:
        """Resolve a regra comercial usada como fotografia na criação da OS operacional."""
        return self.gera_cobranca and not self.clientes_isentos_cobranca.filter(
            pk=getattr(cliente, 'pk', cliente),
        ).exists()
