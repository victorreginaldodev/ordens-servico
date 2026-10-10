"""Regras de quem distribui trabalho num setor (ADRs 0003 e 0008)."""
from rest_framework.exceptions import PermissionDenied

from apps.organizacoes.permissoes import Permissao, tem_permissao


def exigir_distribuicao_no_setor(usuario, servico):
    if not tem_permissao(usuario, Permissao.TAREFAS_DISTRIBUIR, servico.setor_id):
        raise PermissionDenied('Seu perfil não pode distribuir tarefas neste setor.')
