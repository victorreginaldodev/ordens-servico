from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0011_ordemservico_dia_vencimento'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='liberar_em',
            field=models.CharField(choices=[('venda', 'Na venda'), ('conclusao', 'Na conclusão dos serviços')], default='conclusao', max_length=10),
        ),
    ]
