from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0032_servico_alerta_ciente_por'),
    ]

    operations = [
        migrations.AddField(
            model_name='servico',
            name='alerta_ciente_motivo',
            field=models.CharField(blank=True, choices=[('cliente', 'Aguardando o cliente'), ('documentacao', 'Aguardando documentação'), ('agendamento', 'Aguardando agendamento'), ('terceiro', 'Aguardando terceiro'), ('outro', 'Outro')], max_length=15, null=True),
        ),
    ]
