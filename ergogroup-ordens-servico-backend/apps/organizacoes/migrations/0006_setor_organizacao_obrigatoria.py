import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0005_preenche_setor_organizacao'),
    ]

    operations = [
        migrations.AlterField(
            model_name='setor',
            name='organizacao',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='setores', to='organizacoes.organizacao',
            ),
        ),
    ]
