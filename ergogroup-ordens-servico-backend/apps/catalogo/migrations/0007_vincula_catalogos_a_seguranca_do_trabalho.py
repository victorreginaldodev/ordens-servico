"""Todo catálogo passa a ter o setor responsável pela execução. Por decisão de 10/10/2026, os catálogos
ainda sem setor ficam com Segurança do Trabalho; a classificação fina vem depois."""
from django.db import migrations

ORGANIZACAO = 'Ergogroup'
SETOR_PADRAO = 'Segurança do Trabalho'


def vincular(apps, schema_editor):
    Catalogo = apps.get_model('catalogo', 'Catalogo')
    Setor = apps.get_model('organizacoes', 'Setor')

    sem_setor = Catalogo.objects.filter(setor__isnull=True)
    if not sem_setor.exists():
        return
    setor = Setor.objects.get(organizacao__nome=ORGANIZACAO, nome=SETOR_PADRAO)
    sem_setor.update(setor=setor)


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0006_catalogo_ativo'),
        ('organizacoes', '0013_cria_setores_funcoes_e_vinculos_iniciais'),
    ]

    operations = [
        migrations.RunPython(vincular, migrations.RunPython.noop),
    ]
