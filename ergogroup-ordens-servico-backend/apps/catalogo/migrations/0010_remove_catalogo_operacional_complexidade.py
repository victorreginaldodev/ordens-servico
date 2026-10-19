from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('catalogo', '0009_catalogo_operacional_cobranca'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='catalogooperacional',
            name='complexidade',
        ),
    ]
