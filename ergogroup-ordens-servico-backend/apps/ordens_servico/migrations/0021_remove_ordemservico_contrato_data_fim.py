from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0020_remove_ordemservico_contrato_data_inicio'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='contrato_data_fim',
        ),
    ]
