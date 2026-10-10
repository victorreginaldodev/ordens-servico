from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0003_catalogo_setor'),
        # Os valores são copiados para os serviços antes de as colunas saírem.
        ('ordens_servico', '0006_congela_horas_complexidade_do_catalogo'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='catalogo',
            name='complexidade',
        ),
    ]
