from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('catalogo', '0010_remove_catalogo_operacional_complexidade'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='catalogooperacional',
            name='horas_estimadas',
        ),
    ]
