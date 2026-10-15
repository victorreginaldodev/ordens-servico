from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0038_remove_ordemservico_valor_mensal'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='dia_fechamento',
        ),
    ]
