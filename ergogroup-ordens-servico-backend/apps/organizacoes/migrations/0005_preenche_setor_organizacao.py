from django.db import migrations


def preencher_organizacao(apps, schema_editor):
    Setor = apps.get_model('organizacoes', 'Setor')
    Organizacao = apps.get_model('organizacoes', 'Organizacao')

    if not Setor.objects.filter(organizacao__isnull=True).exists():
        return
    organizacao = Organizacao.objects.order_by('id').first()
    if organizacao is None:
        raise RuntimeError('Existem setores mas nenhuma organização para vinculá-los.')
    Setor.objects.filter(organizacao__isnull=True).update(organizacao=organizacao)


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0004_setor_organizacao'),
    ]

    operations = [
        migrations.RunPython(preencher_organizacao, migrations.RunPython.noop),
    ]
