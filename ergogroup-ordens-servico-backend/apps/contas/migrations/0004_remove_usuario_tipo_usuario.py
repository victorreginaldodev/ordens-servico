from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contas', '0003_remove_usuario_ativo'),
        # Os vínculos com setores são criados a partir do tipo antes de ele sair.
        ('organizacoes', '0013_cria_setores_funcoes_e_vinculos_iniciais'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='usuario',
            name='tipo_usuario',
        ),
    ]
