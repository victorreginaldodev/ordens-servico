from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0048_preenche_recebimento'),
    ]

    operations = [
        migrations.AddField(
            model_name='tarefa',
            name='atribuida_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
