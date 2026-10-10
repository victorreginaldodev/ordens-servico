from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0016_confere_um_setor_por_usuario'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='membrosetor',
            constraint=models.UniqueConstraint(fields=('usuario',), name='membro_setor_um_setor_por_usuario'),
        ),
    ]
