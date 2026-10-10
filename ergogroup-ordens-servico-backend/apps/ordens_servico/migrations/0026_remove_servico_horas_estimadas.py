from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0025_conta_horas_e_complexidade'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='servico',
            name='horas_estimadas',
        ),
    ]
