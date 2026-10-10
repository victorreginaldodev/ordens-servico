"""Catálogo de permissões do sistema e verificação de acesso.

As regras da API perguntam por códigos de permissão (``tem_permissao``), nunca por tipo de usuário.
As permissões de cada usuário vêm das funções que ele exerce nos setores (``MembroSetor``); sem
vínculo, o usuário só acessa o que é dele. Ver docs/mapa-de-permissoes.md.
"""
from django.db import models
from rest_framework.permissions import BasePermission


class Permissao(models.TextChoices):
    OS_VER_TODAS = 'os.ver_todas', 'Ver todas as OS, serviços e tarefas'
    OS_GERENCIAR = 'os.gerenciar', 'Criar e editar OS e seus serviços'
    OS_EXCLUIR = 'os.excluir', 'Excluir OS'
    OS_OPERACIONAL_GERENCIAR = 'os_operacional.gerenciar', 'Criar e editar OS operacionais e o catálogo operacional'
    FINANCEIRO_VER_VALORES = 'financeiro.ver_valores', 'Ver valores e condições de pagamento'
    FINANCEIRO_REGISTRAR_COBRANCA = 'financeiro.registrar_cobranca', 'Registrar cobrança e nota fiscal'
    CLIENTES_GERENCIAR = 'clientes.gerenciar', 'Criar, editar e excluir clientes'
    CATALOGO_GERENCIAR = 'catalogo.gerenciar', 'Criar, editar e excluir o catálogo de serviços'
    SERVICOS_VER_SETOR = 'servicos.ver_setor', 'Ver os serviços e tarefas do setor'
    SERVICOS_GERENCIAR = 'servicos.gerenciar', 'Ajustar e excluir serviços do setor'
    TAREFAS_DISTRIBUIR = 'tarefas.distribuir', 'Criar, reatribuir e excluir tarefas'
    TAREFAS_EDITAR_SETOR = 'tarefas.editar_setor', 'Editar qualquer tarefa do setor'
    USUARIOS_GERENCIAR = 'usuarios.gerenciar', 'Criar, editar, ativar e desativar usuários'
    USUARIOS_GERENCIAR_DIRETORIA = 'usuarios.gerenciar_diretoria', 'Gerenciar usuários da diretoria'
    USUARIOS_REDEFINIR_SENHA = 'usuarios.redefinir_senha', 'Alterar a senha de outros usuários'
    ORGANIZACAO_CONFIGURAR = 'organizacao.configurar', 'Configurar organização e setores'
    INDICADORES_VER_GERAL = 'indicadores.ver_geral', 'Ver indicadores de toda a equipe'
    AUDITORIA_VER = 'auditoria.ver', 'Ver o histórico de auditoria'
    SETORES_TODOS = 'setores.todos', 'As permissões por setor valem em todos os setores'


# Permissões que valem só nos setores do vínculo que as concede; as demais valem para a organização toda.
PERMISSOES_POR_SETOR = frozenset({
    Permissao.SERVICOS_VER_SETOR, Permissao.SERVICOS_GERENCIAR,
    Permissao.TAREFAS_DISTRIBUIR, Permissao.TAREFAS_EDITAR_SETOR,
})


# Quem tem as duas num setor organiza aquele setor (ADR 0008, 1): recebe o aviso de chegada e distribui.
PERMISSOES_DE_ORGANIZACAO = frozenset({Permissao.SERVICOS_VER_SETOR, Permissao.TAREFAS_DISTRIBUIR})


def escopo_da_permissao(permissao) -> str:
    return 'setor' if permissao in PERMISSOES_POR_SETOR else 'global'


_TODAS = frozenset(Permissao)


class PerfilDeAcesso:
    """Permissões efetivas de um usuário.

    - ``globais``: valem na organização toda;
    - ``por_setor``: ``{setor_id: permissões}`` para as permissões de escopo por setor;
    - ``todos_os_setores``: verdadeiro quando as permissões por setor valem em qualquer setor
      (superusuário, ou quem tem ``setores.todos``).
    """

    def __init__(self, globais=frozenset(), por_setor=None, todos_os_setores=False):
        self.globais = frozenset(globais)
        self.por_setor = por_setor or {}
        self.todos_os_setores = todos_os_setores

    @property
    def todas(self) -> frozenset:
        return self.globais.union(*self.por_setor.values())

    def tem(self, permissao, setor=None) -> bool:
        if permissao not in PERMISSOES_POR_SETOR or self.todos_os_setores:
            return permissao in self.globais
        if setor is None:
            # Sem setor definido (inclusive serviços ainda sem setor): basta ter a permissão em algum setor.
            return any(permissao in permissoes for permissoes in self.por_setor.values())
        return permissao in self.por_setor.get(getattr(setor, 'pk', setor), frozenset())

    def setores_com(self, permissao):
        """IDs dos setores onde a permissão vale, ou ``None`` se vale em todos."""
        if self.todos_os_setores:
            return None if permissao in self.globais else set()
        return {setor_id for setor_id, permissoes in self.por_setor.items() if permissao in permissoes}


def _perfil_pelos_vinculos(vinculos) -> PerfilDeAcesso:
    globais, por_setor = set(), {}
    for vinculo in vinculos:
        if not (vinculo.setor.ativo and vinculo.funcao.ativo):
            continue
        for item in vinculo.funcao.permissoes.all():
            if item.permissao in PERMISSOES_POR_SETOR:
                por_setor.setdefault(vinculo.setor_id, set()).add(item.permissao)
            else:
                globais.add(item.permissao)
    if Permissao.SETORES_TODOS in globais:
        # Ex.: diretoria. As permissões por setor que a pessoa tem em algum vínculo valem em todos os setores.
        return PerfilDeAcesso(globais.union(*por_setor.values()), todos_os_setores=True)
    return PerfilDeAcesso(globais, {k: frozenset(v) for k, v in por_setor.items()})


def perfil_de_acesso(usuario) -> PerfilDeAcesso:
    if usuario is None or not usuario.is_authenticated or not usuario.is_active:
        return PerfilDeAcesso()
    if usuario.is_superuser:
        return PerfilDeAcesso(_TODAS, todos_os_setores=True)
    perfil = getattr(usuario, '_perfil_de_acesso', None)
    if perfil is None:
        from apps.organizacoes.models import MembroSetor

        vinculos = list(
            MembroSetor.objects.filter(usuario=usuario)
            .select_related('setor', 'funcao').prefetch_related('funcao__permissoes')
        )
        perfil = _perfil_pelos_vinculos(vinculos)
        usuario._perfil_de_acesso = perfil
    return perfil


def permissoes_do_usuario(usuario) -> frozenset:
    """Todas as permissões do usuário, em qualquer setor."""
    return perfil_de_acesso(usuario).todas


def tem_permissao(usuario, permissao, setor=None) -> bool:
    """Indica se o usuário tem a permissão. Para permissões por setor, ``setor`` (objeto ou id) restringe
    a verificação àquele setor; sem ``setor``, basta tê-la em algum setor."""
    return perfil_de_acesso(usuario).tem(permissao, setor)


def setores_com_permissao(usuario, permissao):
    """IDs dos setores em que o usuário tem a permissão, ou ``None`` se ela vale em todos."""
    return perfil_de_acesso(usuario).setores_com(permissao)


def eh_diretoria(usuario) -> bool:
    """Superusuário ou quem tem uma função com `usuarios.gerenciar_diretoria`. Considera os vínculos mesmo
    de usuário, setor ou função inativos, para que reativar um diretor também exija ser da diretoria."""
    from apps.organizacoes.models import MembroSetor

    return usuario.is_superuser or MembroSetor.objects.filter(
        usuario=usuario, funcao__permissoes__permissao=Permissao.USUARIOS_GERENCIAR_DIRETORIA,
    ).exists()


def pode_conceder(usuario, permissoes, setor=None) -> bool:
    """Ninguém concede permissão que não tem: vale para montar funções e para vincular pessoas a elas.
    Com ``setor``, as permissões por setor precisam valer para o usuário naquele setor."""
    perfil = perfil_de_acesso(usuario)
    return all(perfil.tem(permissao, setor) for permissao in permissoes)


class TemPermissao(BasePermission):
    """Exige ao menos uma das permissões informadas. Uso: ``TemPermissao(Permissao.X, Permissao.Y)``."""
    message = 'Seu perfil não tem permissão para esta ação.'

    def __init__(self, *permissoes):
        self.permissoes = permissoes

    def has_permission(self, request, view):
        return any(tem_permissao(request.user, p) for p in self.permissoes)


class PermissoesPorAcaoMixin:
    """Para viewsets: ``permissoes_por_acao = {'create': (Permissao.X,), ...}``. Ações fora do mapa
    exigem só autenticação; ações no mapa exigem ao menos uma das permissões listadas."""
    permissoes_por_acao = {}

    def get_permissions(self):
        permissoes = super().get_permissions()
        exigidas = self.permissoes_por_acao.get(self.action)
        if exigidas:
            permissoes.append(TemPermissao(*exigidas))
        return permissoes
