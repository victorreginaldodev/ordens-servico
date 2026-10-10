"""Serviços já existentes recebem o setor do seu catálogo. Daqui em diante o setor é copiado na criação
do serviço (``Servico.definir_setor_pelo_catalogo``); serviços sem catálogo continuam sem setor."""
from django.db import migrations
from django.db.models import OuterRef, Subquery


def preencher(apps, schema_editor):
    Servico = apps.get_model('ordens_servico', 'Servico')
    Catalogo = apps.get_model('catalogo', 'Catalogo')

    Servico.objects.filter(setor__isnull=True, catalogo__isnull=False).update(
        setor=Subquery(Catalogo.objects.filter(pk=OuterRef('catalogo_id')).values('setor_id')[:1]),
    )


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0006_congela_horas_complexidade_do_catalogo'),
        ('catalogo', '0007_vincula_catalogos_a_seguranca_do_trabalho'),
    ]

    operations = [
        migrations.RunPython(preencher, migrations.RunPython.noop),
    ]
