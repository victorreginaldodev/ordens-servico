from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0004_remove_catalogo_complexidade'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='catalogo',
            name='horas_estimadas',
        ),
    ]
