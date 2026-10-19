from django.db import migrations, models


CODIGO = 'catalogo_operacional.configurar_cobranca'


def conceder_a_diretoria(apps, schema_editor):
    FuncaoPermissao = apps.get_model('organizacoes', 'FuncaoPermissao')
    funcoes_diretoria = apps.get_model('organizacoes', 'Funcao').objects.filter(nome='Diretor')
    FuncaoPermissao.objects.bulk_create(
        FuncaoPermissao(funcao=funcao, permissao=CODIGO)
        for funcao in funcoes_diretoria
        if not FuncaoPermissao.objects.filter(funcao=funcao, permissao=CODIGO).exists()
    )


def remover_da_diretoria(apps, schema_editor):
    apps.get_model('organizacoes', 'FuncaoPermissao').objects.filter(permissao=CODIGO).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('organizacoes', '0022_gestor_tecnico_sem_ver_valores'),
    ]

    operations = [
        migrations.AlterField(
            model_name='funcaopermissao',
            name='permissao',
            field=models.CharField(
                choices=[
                    ('os.ver_todas', 'Ver todas as OS, serviços e tarefas'),
                    ('os.gerenciar', 'Criar e editar OS e seus serviços'),
                    ('os.excluir', 'Excluir OS'),
                    ('os_operacional.gerenciar', 'Criar e editar OS operacionais e o catálogo operacional'),
                    (CODIGO, 'Configurar cobrança e exceções por cliente no catálogo operacional'),
                    ('financeiro.ver_valores', 'Ver valores e condições de pagamento'),
                    ('financeiro.registrar_cobranca', 'Registrar cobrança e nota fiscal'),
                    ('clientes.gerenciar', 'Criar, editar e excluir clientes'),
                    ('catalogo.gerenciar', 'Criar, editar e excluir o catálogo de serviços'),
                    ('servicos.ver_setor', 'Ver os serviços e tarefas do setor'),
                    ('servicos.gerenciar', 'Ajustar e excluir serviços do setor'),
                    ('tarefas.distribuir', 'Criar, reatribuir e excluir tarefas'),
                    ('tarefas.editar_setor', 'Editar qualquer tarefa do setor'),
                    ('tarefas.receber', 'Pode ser responsável por tarefas do setor'),
                    ('usuarios.gerenciar', 'Criar, editar, ativar e desativar usuários'),
                    ('usuarios.gerenciar_diretoria', 'Gerenciar usuários da diretoria'),
                    ('usuarios.redefinir_senha', 'Alterar a senha de outros usuários'),
                    ('organizacao.configurar', 'Configurar organização e setores'),
                    ('indicadores.ver_geral', 'Ver indicadores de toda a equipe'),
                    ('auditoria.ver', 'Ver o histórico de auditoria'),
                    ('setores.todos', 'As permissões por setor valem em todos os setores'),
                ],
                max_length=50,
            ),
        ),
        migrations.RunPython(conceder_a_diretoria, remover_da_diretoria),
    ]
