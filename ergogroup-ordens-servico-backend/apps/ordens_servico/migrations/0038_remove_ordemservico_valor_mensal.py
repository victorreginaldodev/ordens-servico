from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0037_converte_recorrente_e_intervalo'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='valor_mensal',
        ),
    ]
