from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0012_ordemservico_liberar_em'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='origem_lancamento',
            field=models.CharField(blank=True, choices=[('manual', 'Manual'), ('integracao', 'Integração')], max_length=10, null=True),
        ),
    ]
