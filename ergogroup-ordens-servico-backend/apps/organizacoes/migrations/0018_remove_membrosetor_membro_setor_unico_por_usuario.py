from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0017_membrosetor_um_setor_por_usuario'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='membrosetor',
            name='membro_setor_unico_por_usuario',
        ),
    ]
