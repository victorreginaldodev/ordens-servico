import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0041_remove_ordemservico_intervalo_parcelas_dias'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='vencimento_dias_apos_nota',
            field=models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(365)]),
        ),
    ]
