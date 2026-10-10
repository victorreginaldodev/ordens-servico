from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0007_setor_nome_sem_unicidade_global'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='setor',
            constraint=models.UniqueConstraint(fields=('organizacao', 'nome'), name='setor_nome_unico_por_organizacao'),
        ),
    ]
