from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0039_remove_ordemservico_dia_fechamento'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='dia_vencimento',
        ),
    ]
