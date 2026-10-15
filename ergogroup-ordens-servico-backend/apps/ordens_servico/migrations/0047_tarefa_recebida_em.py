from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0046_servico_recebido_por'),
    ]

    operations = [
        migrations.AddField(
            model_name='tarefa',
            name='recebida_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
