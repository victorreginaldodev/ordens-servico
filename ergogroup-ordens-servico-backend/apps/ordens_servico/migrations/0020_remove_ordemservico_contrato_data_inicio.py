from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0019_remove_ordemservico_objeto_contrato'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='contrato_data_inicio',
        ),
    ]
