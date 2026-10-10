from django.db import models


class SubitemCatalogo(models.Model):
    catalogo = models.ForeignKey(
        'catalogo.Catalogo',
        on_delete=models.CASCADE,
        related_name='subitens',
    )
    nome = models.CharField(max_length=150)
    descricao = models.TextField(null=True, blank=True)
    ativo = models.BooleanField(default=True)
    ordem = models.PositiveIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['catalogo__nome', 'ordem', 'nome']
        verbose_name = 'Subitem de catálogo'
        verbose_name_plural = 'Subitens de catálogo'
        constraints = [
            models.UniqueConstraint(
                fields=['catalogo', 'nome'],
                name='unique_subitem_por_catalogo',
            ),
        ]

    def __str__(self):
        return f'{self.catalogo} - {self.nome}'
