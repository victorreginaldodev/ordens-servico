from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contas', '0002_unifica_status_ativo'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='usuario',
            name='ativo',
        ),
    ]
