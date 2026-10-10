from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0016_remove_ordemservico_cobranca_imediata'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='numero_nf',
        ),
    ]
