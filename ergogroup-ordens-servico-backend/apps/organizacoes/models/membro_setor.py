from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class MembroSetor(models.Model):
    """Vínculo de um usuário com o seu setor, exercendo uma função. Cada usuário pertence a um único setor."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vinculos_setor',
    )
    setor = models.ForeignKey(
        'organizacoes.Setor',
        on_delete=models.PROTECT,
        related_name='membros',
    )
    funcao = models.ForeignKey(
        'organizacoes.Funcao',
        on_delete=models.PROTECT,
        related_name='membros',
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['setor__nome', 'usuario__nome_completo']
        verbose_name = 'Membro de setor'
        verbose_name_plural = 'Membros de setor'
        constraints = [
            models.UniqueConstraint(fields=['usuario'], name='membro_setor_um_setor_por_usuario'),
        ]

    def __str__(self):
        return f'{self.usuario} — {self.funcao} em {self.setor}'

    def clean(self):
        if not (self.setor_id and self.funcao_id):
            return
        if self.setor.organizacao_id != self.funcao.organizacao_id:
            raise ValidationError({'funcao': 'A função precisa ser da mesma organização do setor.'})
        if not self.funcao.liberada_no_setor(self.setor_id):
            raise ValidationError({
                'funcao': f'A função "{self.funcao}" não pode ser usada no setor "{self.setor}".',
            })
