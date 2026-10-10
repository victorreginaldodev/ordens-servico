from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0026_remove_servico_horas_estimadas'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='servico',
            name='complexidade',
        ),
    ]
