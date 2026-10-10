from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0033_servico_alerta_ciente_motivo'),
    ]

    operations = [
        migrations.AddField(
            model_name='servico',
            name='alerta_ciente_observacao',
            field=models.TextField(blank=True, null=True),
        ),
    ]
