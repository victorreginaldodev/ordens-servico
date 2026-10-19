from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('ordens_servico', '0052_remove_oso_complexidade'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservicooperacional',
            name='horas_estimadas',
        ),
    ]
