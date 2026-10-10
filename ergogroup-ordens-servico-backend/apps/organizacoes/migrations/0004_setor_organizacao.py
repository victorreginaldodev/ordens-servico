import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0003_cria_organizacao_ergogroup'),
    ]

    operations = [
        migrations.AddField(
            model_name='setor',
            name='organizacao',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name='setores', to='organizacoes.organizacao',
            ),
        ),
    ]
