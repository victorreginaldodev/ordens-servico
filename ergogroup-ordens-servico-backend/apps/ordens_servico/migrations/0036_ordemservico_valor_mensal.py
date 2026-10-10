from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0035_recalcula_prazo_dos_servicos'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='valor_mensal',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
