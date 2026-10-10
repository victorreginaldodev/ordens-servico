"""O que cada usuário enxerga de OS, serviços e tarefas.

- com `os.ver_todas`: tudo;
- com `servicos.ver_setor`: os serviços dos setores onde tem essa permissão (e os serviços ainda sem
  setor, que ficam visíveis a quem gerencia algum setor até os catálogos serem classificados);
- sempre: o que tem tarefa atribuída ao próprio usuário.
"""
from django.db.models import Q

from apps.organizacoes.permissoes import Permissao, setores_com_permissao, tem_permissao


def _condicao_servico(usuario, prefixo=''):
    """Condição sobre `Servico`; `prefixo` é o caminho até o serviço a partir do modelo filtrado."""
    if tem_permissao(usuario, Permissao.OS_VER_TODAS):
        return None
    setores = setores_com_permissao(usuario, Permissao.SERVICOS_VER_SETOR)
    if setores is None:
        return None
    condicao = Q(**{f'{prefixo}tarefas__responsavel': usuario})
    if setores:
        condicao |= Q(**{f'{prefixo}setor_id__in': setores}) | Q(**{f'{prefixo}setor__isnull': True})
    return condicao


def ordens_visiveis(queryset, usuario):
    condicao = _condicao_servico(usuario, prefixo='servicos__')
    return queryset if condicao is None else queryset.filter(condicao).distinct()


def servicos_visiveis(queryset, usuario):
    condicao = _condicao_servico(usuario)
    return queryset if condicao is None else queryset.filter(condicao).distinct()


def tarefas_visiveis(queryset, usuario):
    if tem_permissao(usuario, Permissao.OS_VER_TODAS):
        return queryset
    setores = setores_com_permissao(usuario, Permissao.SERVICOS_VER_SETOR)
    if setores is None:
        return queryset
    condicao = Q(responsavel=usuario)
    if setores:
        condicao |= Q(servico__setor_id__in=setores) | Q(servico__setor__isnull=True)
    return queryset.filter(condicao)
