from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0030_preenche_ultima_movimentacao'),
    ]

    operations = [
        migrations.AddField(
            model_name='servico',
            name='alerta_ciente_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
