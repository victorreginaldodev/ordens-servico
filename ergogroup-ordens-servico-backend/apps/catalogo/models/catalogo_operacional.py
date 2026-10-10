from django.db import models

from apps.catalogo.models.catalogo import Complexidade


class CatalogoOperacional(models.Model):
    """Catálogo de serviços disponíveis para Ordens de Serviço Operacionais."""
    nome = models.CharField(max_length=50)
    descricao = models.TextField(null=True, blank=True)
    horas_estimadas = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    complexidade = models.PositiveSmallIntegerField(choices=Complexidade.choices, null=True, blank=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Catálogo Operacional'
        verbose_name_plural = 'Catálogos Operacionais'

    def __str__(self):
        return self.nome
