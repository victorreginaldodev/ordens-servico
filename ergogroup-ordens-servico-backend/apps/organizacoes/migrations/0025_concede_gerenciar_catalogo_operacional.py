from django.db import migrations


CODIGO = 'catalogo_operacional.gerenciar'
ANTERIOR = 'os_operacional.gerenciar'


def conceder_a_quem_gerenciava(apps, schema_editor):
    """Até aqui, `os_operacional.gerenciar` também liberava o catálogo operacional. As funções que a têm
    recebem a permissão nova para ninguém perder o acesso que já tinha."""
    FuncaoPermissao = apps.get_model('organizacoes', 'FuncaoPermissao')
    ja_tem = set(FuncaoPermissao.objects.filter(permissao=CODIGO).values_list('funcao_id', flat=True))
    FuncaoPermissao.objects.bulk_create(
        FuncaoPermissao(funcao_id=funcao_id, permissao=CODIGO)
        for funcao_id in FuncaoPermissao.objects.filter(permissao=ANTERIOR).values_list('funcao_id', flat=True)
        if funcao_id not in ja_tem
    )


def remover(apps, schema_editor):
    apps.get_model('organizacoes', 'FuncaoPermissao').objects.filter(permissao=CODIGO).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('organizacoes', '0024_permissao_gerenciar_catalogo_operacional'),
    ]

    operations = [
        migrations.RunPython(conceder_a_quem_gerenciava, remover),
    ]
