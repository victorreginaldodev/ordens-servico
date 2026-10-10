"""Setores, funções e vínculos iniciais da Ergogroup (decisão de 10/10/2026).

Cada tipo de usuário vira uma função com as mesmas permissões que o tipo concedia
(PERMISSOES_POR_TIPO_USUARIO na data desta migração), e cada usuário é vinculado ao setor
da sua área com a função do seu tipo. Assim o acesso de ninguém muda com a migração.

Os valores estão escritos aqui, e não importados, para que mudanças futuras no código não
alterem o que esta migração faz.
"""
from django.db import migrations

ORGANIZACAO = 'Ergogroup'

# tipo_usuario -> (setor, função, permissões)
MAPEAMENTO = {
    'diretor': ('Diretoria', 'Diretor', [
        'auditoria.ver', 'catalogo.gerenciar', 'clientes.gerenciar', 'financeiro.registrar_cobranca',
        'financeiro.ver_valores', 'indicadores.ver_geral', 'organizacao.configurar', 'os.excluir',
        'os.gerenciar', 'os.ver_todas', 'os_operacional.gerenciar', 'servicos.gerenciar', 'servicos.ver_setor',
        'setores.todos', 'tarefas.distribuir', 'tarefas.editar_setor', 'usuarios.gerenciar',
        'usuarios.gerenciar_diretoria', 'usuarios.redefinir_senha',
    ]),
    'gestor_comercial': ('Comercial', 'Gestor Comercial', [
        'auditoria.ver', 'catalogo.gerenciar', 'clientes.gerenciar', 'financeiro.registrar_cobranca',
        'financeiro.ver_valores', 'indicadores.ver_geral', 'organizacao.configurar', 'os.excluir',
        'os.gerenciar', 'os.ver_todas', 'os_operacional.gerenciar', 'servicos.gerenciar', 'servicos.ver_setor',
        'setores.todos', 'tarefas.distribuir', 'tarefas.editar_setor', 'usuarios.gerenciar',
        'usuarios.gerenciar_diretoria', 'usuarios.redefinir_senha',
    ]),
    'comercial': ('Comercial', 'Comercial', [
        'auditoria.ver', 'catalogo.gerenciar', 'clientes.gerenciar', 'financeiro.ver_valores',
        'indicadores.ver_geral', 'os.gerenciar', 'os.ver_todas', 'os_operacional.gerenciar',
    ]),
    'gestor_tecnico': ('Segurança do Trabalho', 'Gestor Técnico', [
        'auditoria.ver', 'catalogo.gerenciar', 'clientes.gerenciar', 'financeiro.ver_valores',
        'indicadores.ver_geral', 'organizacao.configurar', 'os.gerenciar', 'os.ver_todas',
        'os_operacional.gerenciar', 'servicos.gerenciar', 'servicos.ver_setor', 'tarefas.distribuir',
        'tarefas.editar_setor', 'usuarios.gerenciar',
    ]),
    'sub_gestor_tecnico': ('Segurança do Trabalho', 'Sub-Gestor Técnico', [
        'auditoria.ver', 'catalogo.gerenciar', 'clientes.gerenciar', 'indicadores.ver_geral', 'os.ver_todas',
        'os_operacional.gerenciar', 'servicos.gerenciar', 'servicos.ver_setor', 'tarefas.distribuir',
        'tarefas.editar_setor',
    ]),
    'tecnico': ('Segurança do Trabalho', 'Técnico', [
        'auditoria.ver', 'clientes.gerenciar', 'os_operacional.gerenciar',
    ]),
    'gestor_financeiro': ('Financeiro', 'Gestor Financeiro', [
        'auditoria.ver', 'clientes.gerenciar', 'financeiro.registrar_cobranca', 'financeiro.ver_valores',
        'indicadores.ver_geral', 'organizacao.configurar', 'os.gerenciar', 'os.ver_todas',
        'os_operacional.gerenciar', 'usuarios.gerenciar',
    ]),
    'financeiro': ('Financeiro', 'Financeiro', [
        'auditoria.ver', 'clientes.gerenciar', 'financeiro.registrar_cobranca', 'financeiro.ver_valores',
        'indicadores.ver_geral', 'os.gerenciar', 'os.ver_todas', 'os_operacional.gerenciar',
    ]),
    'gestor_administrativo': ('Administrativo', 'Gestor Administrativo', [
        'auditoria.ver', 'clientes.gerenciar', 'indicadores.ver_geral', 'organizacao.configurar', 'os.gerenciar',
        'os.ver_todas', 'os_operacional.gerenciar', 'usuarios.gerenciar', 'usuarios.redefinir_senha',
    ]),
    'administrativo': ('Administrativo', 'Administrativo', [
        'auditoria.ver', 'clientes.gerenciar', 'indicadores.ver_geral', 'os.gerenciar', 'os.ver_todas',
    ]),
}


def criar_estrutura_e_vincular(apps, schema_editor):
    Organizacao = apps.get_model('organizacoes', 'Organizacao')
    Setor = apps.get_model('organizacoes', 'Setor')
    Funcao = apps.get_model('organizacoes', 'Funcao')
    FuncaoPermissao = apps.get_model('organizacoes', 'FuncaoPermissao')
    MembroSetor = apps.get_model('organizacoes', 'MembroSetor')
    Usuario = apps.get_model('contas', 'Usuario')

    organizacao, _ = Organizacao.objects.get_or_create(nome=ORGANIZACAO)

    funcoes = {}
    for tipo, (nome_setor, nome_funcao, permissoes) in MAPEAMENTO.items():
        setor, _ = Setor.objects.get_or_create(organizacao=organizacao, nome=nome_setor)
        funcao, _ = Funcao.objects.get_or_create(organizacao=organizacao, nome=nome_funcao)
        existentes = set(FuncaoPermissao.objects.filter(funcao=funcao).values_list('permissao', flat=True))
        FuncaoPermissao.objects.bulk_create(
            FuncaoPermissao(funcao=funcao, permissao=codigo) for codigo in sorted(set(permissoes) - existentes)
        )
        funcoes[tipo] = (setor, funcao)

    sem_mapeamento = []
    for usuario in Usuario.objects.all():
        destino = funcoes.get(usuario.tipo_usuario)
        if destino is None:
            sem_mapeamento.append(usuario.pk)
            continue
        setor, funcao = destino
        MembroSetor.objects.get_or_create(usuario=usuario, setor=setor, defaults={'funcao': funcao})
    if sem_mapeamento:
        # Esses usuários continuam com as permissões do tipo (fallback) até receberem um vínculo.
        print(f'\n  Usuários sem tipo mapeado, não vinculados: {sem_mapeamento}')


def desfazer(apps, schema_editor):
    Organizacao = apps.get_model('organizacoes', 'Organizacao')
    Setor = apps.get_model('organizacoes', 'Setor')
    Funcao = apps.get_model('organizacoes', 'Funcao')
    MembroSetor = apps.get_model('organizacoes', 'MembroSetor')

    organizacao = Organizacao.objects.filter(nome=ORGANIZACAO).first()
    if organizacao is None:
        return
    nomes_funcoes = {nome_funcao for _, nome_funcao, _ in MAPEAMENTO.values()}
    nomes_setores = {nome_setor for nome_setor, _, _ in MAPEAMENTO.values()}
    MembroSetor.objects.filter(funcao__organizacao=organizacao, funcao__nome__in=nomes_funcoes).delete()
    Funcao.objects.filter(organizacao=organizacao, nome__in=nomes_funcoes).delete()
    Setor.objects.filter(organizacao=organizacao, nome__in=nomes_setores, membros__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0012_funcaopermissao_setores_todos'),
        ('contas', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(criar_estrutura_e_vincular, desfazer),
    ]
