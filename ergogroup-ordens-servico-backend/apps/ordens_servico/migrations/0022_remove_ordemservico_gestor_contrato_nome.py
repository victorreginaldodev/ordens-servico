from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0021_remove_ordemservico_contrato_data_fim'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='gestor_contrato_nome',
        ),
    ]
