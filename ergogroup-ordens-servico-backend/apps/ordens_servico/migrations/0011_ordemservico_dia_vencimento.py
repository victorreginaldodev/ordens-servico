import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0010_ordemservico_dia_fechamento'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='dia_vencimento',
            field=models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(31)]),
        ),
    ]
