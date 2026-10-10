from datetime import date, datetime
from decimal import Decimal

from django.db import models

from apps.auditoria.context import get_auditoria_context, usuario_do_contexto
from apps.auditoria.models import (
    AcaoAuditoria,
    EntidadeAuditada,
    OrigemAuditoria,
    RegistroAuditoria,
)


ENTIDADE_POR_MODELO = {
    'ordemservico': EntidadeAuditada.ORDEM_SERVICO,
    'servico': EntidadeAuditada.SERVICO,
    'tarefa': EntidadeAuditada.TAREFA,
    'ordemservicooperacional': EntidadeAuditada.MINI_OS,
}


# `numero_nf` é da OS operacional; na OS, o lançamento usa `referencia_lancamento` e `origem_lancamento`.
CAMPOS_COBRANCA_REALIZADA = {
    'cobranca_realizada', 'numero_nf', 'referencia_lancamento', 'origem_lancamento', 'data_cobranca',
    'cobranca_realizada_por_id',
}
CAMPOS_LIBERACAO_COBRANCA_OS = {
    'liberada_para_cobranca',
    'liberada_para_cobranca_em',
    'liberada_para_cobranca_por_id',
}
CAMPOS_LIBERACAO_COBRANCA = {
    'gera_cobranca',
    'data_liberacao_cobranca',
    'liberada_cobranca_por_id',
}


def snapshot_modelo(instance):
    dados = {}
    for field in instance._meta.concrete_fields:
        dados[field.attname] = serializar_valor(getattr(instance, field.attname))
    return dados


def diff_snapshots(antes, depois):
    alteracoes = {}
    for campo, valor_depois in depois.items():
        valor_antes = antes.get(campo)
        if valor_antes != valor_depois:
            alteracoes[campo] = {'antes': valor_antes, 'depois': valor_depois}
    return alteracoes


def registrar_auditoria(
    *,
    entidade,
    objeto_id,
    objeto_repr='',
    acao,
    alteracoes=None,
    snapshot=None,
    origem=None,
    motivo=None,
    usuario=None,
    ordem_servico_id=None,
    servico_id=None,
    tarefa_id=None,
    mini_os_id=None,
):
    contexto = get_auditoria_context()
    return RegistroAuditoria.objects.create(
        entidade=entidade,
        objeto_id=objeto_id,
        objeto_repr=(objeto_repr or '')[:255],
        acao=acao,
        origem=origem or contexto.get('origem') or OrigemAuditoria.SISTEMA,
        motivo=motivo,
        usuario=usuario if usuario is not None else usuario_do_contexto(contexto),
        alteracoes=alteracoes or {},
        snapshot=snapshot or {},
        ordem_servico_id=ordem_servico_id,
        servico_id=servico_id,
        tarefa_id=tarefa_id,
        mini_os_id=mini_os_id,
        request_id=contexto.get('request_id'),
        ip=contexto.get('ip'),
        user_agent=contexto.get('user_agent'),
    )


def registrar_evento_modelo(instance, acao, alteracoes=None, snapshot=None, origem=None, motivo=None, usuario=None):
    entidade = entidade_do_modelo(instance)
    if entidade is None:
        return None
    ids = ids_relacionados(instance)
    return registrar_auditoria(
        entidade=entidade,
        objeto_id=instance.pk,
        objeto_repr=str(instance),
        acao=acao,
        alteracoes=alteracoes,
        snapshot=snapshot or snapshot_modelo(instance),
        origem=origem,
        motivo=motivo,
        usuario=usuario,
        **ids,
    )


def registrar_update_direto(instance, updates, acao=AcaoAuditoria.PROPAGACAO_STATUS, motivo=None):
    if not updates:
        return None
    antes = snapshot_modelo(instance)
    depois = {**antes}
    for campo, valor in updates.items():
        campo_snapshot = _normalizar_campo_snapshot(instance, campo)
        depois[campo_snapshot] = serializar_valor(valor)
    return registrar_evento_modelo(
        instance,
        acao,
        alteracoes=diff_snapshots(antes, depois),
        snapshot=depois,
        origem=OrigemAuditoria.SISTEMA,
        motivo=motivo,
    )


def classificar_acao(entidade, alteracoes):
    campos = set(alteracoes.keys())
    if entidade == EntidadeAuditada.ORDEM_SERVICO and campos & CAMPOS_LIBERACAO_COBRANCA_OS:
        return AcaoAuditoria.LIBERACAO_COBRANCA
    if campos & CAMPOS_COBRANCA_REALIZADA:
        return AcaoAuditoria.COBRANCA_REALIZADA
    if entidade == EntidadeAuditada.MINI_OS and campos & CAMPOS_LIBERACAO_COBRANCA:
        return AcaoAuditoria.LIBERACAO_COBRANCA
    if 'status' in campos or 'concluida' in campos:
        return AcaoAuditoria.STATUS
    return AcaoAuditoria.ATUALIZACAO


def entidade_do_modelo(instance):
    return ENTIDADE_POR_MODELO.get(instance._meta.model_name)


def ids_relacionados(instance):
    model_name = instance._meta.model_name
    if model_name == 'ordemservico':
        return {'ordem_servico_id': instance.pk}
    if model_name == 'servico':
        return {'ordem_servico_id': instance.ordem_servico_id, 'servico_id': instance.pk}
    if model_name == 'tarefa':
        return {
            'ordem_servico_id': instance.servico.ordem_servico_id if instance.servico_id else None,
            'servico_id': instance.servico_id,
            'tarefa_id': instance.pk,
        }
    if model_name == 'ordemservicooperacional':
        return {'mini_os_id': instance.pk}
    return {}


def serializar_valor(value):
    if isinstance(value, models.Model):
        return value.pk
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _normalizar_campo_snapshot(instance, campo):
    if campo in snapshot_modelo(instance):
        return campo
    if campo.endswith('_id'):
        return campo
    try:
        field = instance._meta.get_field(campo)
    except Exception:
        return campo
    return field.attname
