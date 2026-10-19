from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('catalogo', '0008_catalogo_setor_obrigatorio'),
        ('clientes', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='catalogooperacional',
            name='gera_cobranca',
            field=models.BooleanField(
                default=False,
                help_text='Indica se novas OS operacionais deste serviço geram cobrança por padrão.',
            ),
        ),
        migrations.AddField(
            model_name='catalogooperacional',
            name='clientes_isentos_cobranca',
            field=models.ManyToManyField(
                blank=True,
                help_text='Clientes que não geram cobrança para este serviço, mesmo quando a regra padrão cobra.',
                related_name='catalogos_operacionais_isentos_cobranca',
                to='clientes.cliente',
            ),
        ),
    ]
