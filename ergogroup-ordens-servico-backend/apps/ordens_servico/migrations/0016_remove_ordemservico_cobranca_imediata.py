from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0015_converte_condicoes_de_pagamento'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='cobranca_imediata',
        ),
    ]
