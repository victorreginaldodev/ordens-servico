from django.db import migrations


def criar_ergogroup(apps, schema_editor):
    Organizacao = apps.get_model('organizacoes', 'Organizacao')
    if not Organizacao.objects.exists():
        Organizacao.objects.create(nome='Ergogroup')


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0002_organizacao'),
    ]

    operations = [
        migrations.RunPython(criar_ergogroup, migrations.RunPython.noop),
    ]
