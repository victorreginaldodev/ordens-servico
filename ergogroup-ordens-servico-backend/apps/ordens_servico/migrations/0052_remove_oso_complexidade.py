from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('ordens_servico', '0051_leva_servicos_ativos_para_ergonomia'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservicooperacional',
            name='complexidade',
        ),
    ]
