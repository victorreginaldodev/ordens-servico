from django.db import models


class Complexidade(models.IntegerChoices):
    BAIXA = 1, 'Baixa'
    MEDIA = 2, 'Média'
    ALTA = 3, 'Alta'


class Catalogo(models.Model):
    """Tipo de serviço vendido. O ``setor`` é o setor responsável por executar esse serviço: é ele que
    define em qual fila o serviço cai quando uma OS é vendida (ver ``Servico.setor``)."""
    nome = models.CharField(max_length=100)
    descricao = models.TextField(null=True, blank=True)
    setor = models.ForeignKey(
        'organizacoes.Setor',
        on_delete=models.PROTECT,
        related_name='catalogos',
        verbose_name='setor responsável pela execução',
    )
    ativo = models.BooleanField(
        default=True,
        help_text='Catálogos inativos continuam nos serviços já vendidos, mas não podem ser usados em serviços novos.',
    )

    class Meta:
        ordering = ['nome']
        verbose_name = 'Catálogo'
        verbose_name_plural = 'Catálogos'

    def __str__(self):
        return self.nome
