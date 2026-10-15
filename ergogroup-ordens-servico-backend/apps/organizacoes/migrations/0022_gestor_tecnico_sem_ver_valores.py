"""Decisão do usuário (14/10/2026, revisão de permissões, P7): o Gestor Técnico, por padrão, não vê valores. A
permissão continua disponível para a diretoria ativar na função, se quiser (quem não a tem não consegue concedê-la)."""
from django.db import migrations


def tirar(apps, schema_editor):
    FuncaoPermissao = apps.get_model('organizacoes', 'FuncaoPermissao')
    total, _ = FuncaoPermissao.objects.filter(
        funcao__nome='Gestor Técnico', permissao='financeiro.ver_valores',
    ).delete()
    print(f'\n  "Ver valores" retirada do Gestor Técnico: {total} registro(s).')


def devolver(apps, schema_editor):
    Funcao = apps.get_model('organizacoes', 'Funcao')
    FuncaoPermissao = apps.get_model('organizacoes', 'FuncaoPermissao')
    for funcao in Funcao.objects.filter(nome='Gestor Técnico'):
        FuncaoPermissao.objects.get_or_create(funcao=funcao, permissao='financeiro.ver_valores')


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0021_marca_recebe_tarefas'),
    ]

    operations = [
        migrations.RunPython(tirar, devolver),
    ]
