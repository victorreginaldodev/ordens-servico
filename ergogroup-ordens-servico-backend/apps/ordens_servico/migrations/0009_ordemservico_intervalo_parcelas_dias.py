from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0008_ordemservico_tipo_condicao'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='intervalo_parcelas_dias',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
