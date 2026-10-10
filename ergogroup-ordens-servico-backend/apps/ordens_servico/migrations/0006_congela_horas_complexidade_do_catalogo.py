from django.db import migrations
from django.db.models import OuterRef, Subquery


def congelar_valores_do_catalogo(apps, schema_editor):
    # Horas e complexidade saem do catálogo. Serviços que ainda herdavam esses
    # valores do catálogo recebem uma cópia, para o histórico não mudar.
    Servico = apps.get_model('ordens_servico', 'Servico')
    Catalogo = apps.get_model('catalogo', 'Catalogo')

    catalogo = Catalogo.objects.filter(pk=OuterRef('catalogo_id'))
    Servico.objects.filter(
        horas_estimadas__isnull=True, catalogo__horas_estimadas__isnull=False,
    ).update(horas_estimadas=Subquery(catalogo.values('horas_estimadas')[:1]))
    Servico.objects.filter(
        complexidade__isnull=True, catalogo__complexidade__isnull=False,
    ).update(complexidade=Subquery(catalogo.values('complexidade')[:1]))


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0003_catalogo_setor'),
        ('ordens_servico', '0005_servico_setor'),
    ]

    operations = [
        migrations.RunPython(congelar_valores_do_catalogo, migrations.RunPython.noop),
    ]
