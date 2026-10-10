from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0018_remove_ordemservico_contrato'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='objeto_contrato',
        ),
    ]
