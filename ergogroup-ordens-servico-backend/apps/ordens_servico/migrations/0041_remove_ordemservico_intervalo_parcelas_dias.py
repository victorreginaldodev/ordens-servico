from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0040_remove_ordemservico_dia_vencimento'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='intervalo_parcelas_dias',
        ),
    ]
