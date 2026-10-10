from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0005_remove_catalogo_horas_estimadas'),
    ]

    operations = [
        migrations.AddField(
            model_name='catalogo',
            name='ativo',
            field=models.BooleanField(
                default=True,
                help_text='Catálogos inativos continuam nos serviços já vendidos, mas não podem ser usados em serviços novos.',
            ),
        ),
    ]
