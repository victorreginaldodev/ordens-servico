from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0017_remove_ordemservico_numero_nf'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='contrato',
        ),
    ]
