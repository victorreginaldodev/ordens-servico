from django.conf import settings
from django.db import models


class AtuacaoEmSetor(models.Model):
    """"Também executa em" (revisão de permissões, P1): um setor, fora o da lotação, em que a pessoa pode ser
    responsável por tarefas. Não dá nenhuma permissão de gestão no setor: a pessoa só recebe tarefas lá.

    Fica na pessoa, e não no vínculo, para não se perder quando ela muda de setor."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='atuacoes')
    setor = models.ForeignKey('organizacoes.Setor', on_delete=models.CASCADE, related_name='atuacoes')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['setor__nome']
        verbose_name = 'Também executa em'
        verbose_name_plural = 'Também executa em'
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'setor'], name='atuacao_unica_por_usuario_e_setor'),
        ]

    def __str__(self):
        return f'{self.usuario} também executa em {self.setor}'
