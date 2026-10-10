import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0007_vincula_catalogos_a_seguranca_do_trabalho'),
    ]

    operations = [
        migrations.AlterField(
            model_name='catalogo',
            name='setor',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='catalogos',
                to='organizacoes.setor', verbose_name='setor responsável pela execução',
            ),
        ),
    ]
