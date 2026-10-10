from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0006_setor_organizacao_obrigatoria'),
    ]

    operations = [
        migrations.AlterField(
            model_name='setor',
            name='nome',
            field=models.CharField(max_length=100),
        ),
    ]
