from django.db import models


class Setor(models.Model):
    organizacao = models.ForeignKey(
        'organizacoes.Organizacao',
        on_delete=models.PROTECT,
        related_name='setores',
    )
    nome = models.CharField(max_length=100)
    descricao = models.TextField(null=True, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Setor'
        verbose_name_plural = 'Setores'
        constraints = [
            models.UniqueConstraint(fields=['organizacao', 'nome'], name='setor_nome_unico_por_organizacao'),
        ]

    def __str__(self):
        return self.nome

    def membros_ativos(self):
        """Vínculos de usuários ativos neste setor. Setor inativo não tem membros ativos."""
        from apps.organizacoes.models import MembroSetor

        if not self.ativo:
            return MembroSetor.objects.none()
        return MembroSetor.objects.filter(setor=self, usuario__is_active=True).select_related('usuario', 'funcao')

    def tem_membro(self, usuario):
        return self.membros_ativos().filter(usuario=usuario).exists()

    def organizadores(self):
        """Membros do setor cuja função tem as permissões de organização (ADR 0008, 1). A diretoria, que
        atua em todos os setores por `setores.todos`, não conta: ela pode agir, mas não organiza o setor."""
        from apps.organizacoes.permissoes import PERMISSOES_DE_ORGANIZACAO

        return [
            vinculo.usuario for vinculo in self.membros_ativos().filter(funcao__ativo=True).prefetch_related(
                'funcao__permissoes',
            )
            if PERMISSOES_DE_ORGANIZACAO <= {item.permissao for item in vinculo.funcao.permissoes.all()}
        ]
