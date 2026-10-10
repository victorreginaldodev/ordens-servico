"""Apoio aos testes: cria usuários já vinculados aos setores e funções iniciais.

Os perfis correspondem aos setores e funções criados pela migração
``organizacoes/0013`` (que roda também no banco de teste).
"""
from apps.contas.models import Usuario
from apps.organizacoes.models import Funcao, MembroSetor, Setor


class Perfil:
    DIRETOR = 'diretor'
    GESTOR_COMERCIAL = 'gestor_comercial'
    COMERCIAL = 'comercial'
    GESTOR_TECNICO = 'gestor_tecnico'
    SUB_GESTOR_TECNICO = 'sub_gestor_tecnico'
    TECNICO = 'tecnico'
    GESTOR_FINANCEIRO = 'gestor_financeiro'
    FINANCEIRO = 'financeiro'
    GESTOR_ADMINISTRATIVO = 'gestor_administrativo'
    ADMINISTRATIVO = 'administrativo'

    values = [
        DIRETOR, GESTOR_COMERCIAL, COMERCIAL, GESTOR_TECNICO, SUB_GESTOR_TECNICO, TECNICO,
        GESTOR_FINANCEIRO, FINANCEIRO, GESTOR_ADMINISTRATIVO, ADMINISTRATIVO,
    ]


SETOR_E_FUNCAO = {
    Perfil.DIRETOR: ('Diretoria', 'Diretor'),
    Perfil.GESTOR_COMERCIAL: ('Comercial', 'Gestor Comercial'),
    Perfil.COMERCIAL: ('Comercial', 'Comercial'),
    Perfil.GESTOR_TECNICO: ('Segurança do Trabalho', 'Gestor Técnico'),
    Perfil.SUB_GESTOR_TECNICO: ('Segurança do Trabalho', 'Sub-Gestor Técnico'),
    Perfil.TECNICO: ('Segurança do Trabalho', 'Técnico'),
    Perfil.GESTOR_FINANCEIRO: ('Financeiro', 'Gestor Financeiro'),
    Perfil.FINANCEIRO: ('Financeiro', 'Financeiro'),
    Perfil.GESTOR_ADMINISTRATIVO: ('Administrativo', 'Gestor Administrativo'),
    Perfil.ADMINISTRATIVO: ('Administrativo', 'Administrativo'),
}


def setor_padrao():
    """Setor ao qual a migração vincula os catálogos sem setor (Segurança do Trabalho)."""
    return Setor.objects.get(nome='Segurança do Trabalho')


def vincular_perfil(usuario, perfil):
    nome_setor, nome_funcao = SETOR_E_FUNCAO[perfil]
    MembroSetor.objects.create(
        usuario=usuario, setor=Setor.objects.get(nome=nome_setor), funcao=Funcao.objects.get(nome=nome_funcao),
    )
    usuario.__dict__.pop('_perfil_de_acesso', None)
    return usuario


def criar_usuario_com_perfil(perfil=None, **dados):
    """Como ``Usuario.objects.create_user``; ``perfil`` (ou ``tipo_usuario``, por compatibilidade com testes
    antigos) define o setor e a função do vínculo."""
    perfil = perfil or dados.pop('tipo_usuario', None)
    usuario = Usuario.objects.create_user(**dados)
    if perfil:
        vincular_perfil(usuario, perfil)
    return usuario


def criar_usuario(perfil, **extra):
    """Cria um usuário com dados genéricos, que ``extra`` pode substituir; ``perfil=None`` cria sem vínculo."""
    n = Usuario.objects.count()
    nome = perfil or 'sem_vinculo'
    dados = {
        'username': f'{nome}_{n}', 'email': f'{nome}{n}@ergogroup.test',
        'password': 'senha-teste-123', 'nome_completo': f'Usuario {nome}', **extra,
    }
    return criar_usuario_com_perfil(perfil, **dados)
