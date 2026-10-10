from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0013_ordemservico_origem_lancamento'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='referencia_lancamento',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
