from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0044_ordemservico_dia_vencimento_demais'),
    ]

    operations = [
        migrations.AddField(
            model_name='servico',
            name='recebido_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
