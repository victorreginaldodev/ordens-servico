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

    def recebedores(self):
        """Quem pode ser responsável por tarefas deste setor (revisão de permissões, P1 e P2): lotado aqui com
        uma função ativa que tem `tarefas.receber`, ou com este setor em "também executa em". `setores.todos`
        não estende `tarefas.receber`: a diretoria recebe onde estiver lotada com ela ou onde também executa."""
        from django.contrib.auth import get_user_model
        from django.db.models import Q

        from apps.organizacoes.permissoes import Permissao

        usuarios = get_user_model().objects.filter(is_active=True)
        if not self.ativo:
            return usuarios.none()
        lotados = Q(
            vinculos_setor__setor=self, vinculos_setor__funcao__ativo=True,
            vinculos_setor__funcao__permissoes__permissao=Permissao.TAREFAS_RECEBER,
        )
        return usuarios.filter(lotados | Q(atuacoes__setor=self)).distinct()

    def recebe_tarefas(self, usuario):
        return self.recebedores().filter(pk=getattr(usuario, 'pk', usuario)).exists()

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
