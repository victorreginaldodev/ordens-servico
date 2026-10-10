from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0027_remove_servico_complexidade'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tarefa',
            name='horas_estimadas',
        ),
    ]
