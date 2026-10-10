from django.db import models, transaction

from apps.organizacoes.permissoes import Permissao


class Funcao(models.Model):
    """Função que um usuário exerce num setor (ex.: "Gestor Comercial"). O nome é livre por organização;
    o que a função permite fazer vem das permissões marcadas nela, e ela só pode ser usada nos setores
    em que foi liberada (``setores``)."""
    organizacao = models.ForeignKey(
        'organizacoes.Organizacao',
        on_delete=models.PROTECT,
        related_name='funcoes',
    )
    nome = models.CharField(max_length=100)
    descricao = models.TextField(null=True, blank=True)
    setores = models.ManyToManyField(
        'organizacoes.Setor',
        related_name='funcoes_permitidas',
        help_text='Setores em que a função pode ser atribuída.',
    )
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Função'
        verbose_name_plural = 'Funções'
        constraints = [
            models.UniqueConstraint(fields=['organizacao', 'nome'], name='funcao_nome_unico_por_organizacao'),
        ]

    def __str__(self):
        return self.nome

    def liberada_no_setor(self, setor) -> bool:
        return self.setores.filter(pk=getattr(setor, 'pk', setor)).exists()

    @property
    def codigos_permissao(self):
        return sorted(self.permissoes.values_list('permissao', flat=True))

    @transaction.atomic
    def definir_permissoes(self, codigos):
        codigos = set(codigos)
        self.permissoes.exclude(permissao__in=codigos).delete()
        existentes = set(self.permissoes.values_list('permissao', flat=True))
        FuncaoPermissao.objects.bulk_create(
            FuncaoPermissao(funcao=self, permissao=codigo) for codigo in codigos - existentes
        )


class FuncaoPermissao(models.Model):
    funcao = models.ForeignKey(Funcao, on_delete=models.CASCADE, related_name='permissoes')
    permissao = models.CharField(max_length=50, choices=Permissao.choices)

    class Meta:
        ordering = ['permissao']
        verbose_name = 'Permissão da função'
        verbose_name_plural = 'Permissões da função'
        constraints = [
            models.UniqueConstraint(fields=['funcao', 'permissao'], name='funcao_permissao_unica'),
        ]

    def __str__(self):
        return f'{self.funcao}: {self.permissao}'
