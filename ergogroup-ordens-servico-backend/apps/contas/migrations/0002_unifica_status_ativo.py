from django.db import migrations


def levar_ativo_para_is_active(apps, schema_editor):
    # Desativado em qualquer uma das duas flags fica desativado: a API de desativação gravava só `ativo`,
    # enquanto a autenticação do Django olha `is_active`.
    Usuario = apps.get_model('contas', 'Usuario')
    Usuario.objects.filter(ativo=False).update(is_active=False)


def restaurar_ativo(apps, schema_editor):
    Usuario = apps.get_model('contas', 'Usuario')
    Usuario.objects.filter(is_active=False).update(ativo=False)


class Migration(migrations.Migration):

    dependencies = [
        ('contas', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(levar_ativo_para_is_active, restaurar_ativo),
    ]
