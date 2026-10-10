"""Blocos do financeiro (ADR 0008, 9; fase 10 do plano). "Faturar" é dar o OK no sistema (o lançamento) e
lançar no sistema financeiro externo; o sistema não controla parcelas."""
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db.models import Count, Prefetch, Q, Sum
from django.utils import timezone

from apps.ordens_servico.models import OrdemServico, Servico
from apps.ordens_servico.models.ordem_servico import LiberarEm, Status
from apps.ordens_servico.services.comercial import andamento
from apps.ordens_servico.services.execucao import dias_desde, etapa_do_servico, hoje, nome


class Situacao:
    A_FATURAR = 'a_faturar'
    FATURADAS = 'faturadas'
    PREVISAO = 'previsao'


SITUACOES = [Situacao.A_FATURAR, Situacao.FATURADAS, Situacao.PREVISAO]

# Cancelada nunca vai ser liberada: não entra na previsão.
FILTRO_SITUACAO = {
    Situacao.A_FATURAR: Q(liberada_para_cobranca=True, cobranca_realizada=False),
    Situacao.FATURADAS: Q(cobranca_realizada=True),
    Situacao.PREVISAO: Q(liberada_para_cobranca=False, cobranca_realizada=False) & ~Q(status=Status.CANCELADA),
}


def situacao_da_ordem(ordem):
    if ordem.cobranca_realizada:
        return Situacao.FATURADAS
    if ordem.liberada_para_cobranca:
        return Situacao.A_FATURAR
    return None if ordem.status == Status.CANCELADA else Situacao.PREVISAO


def dias_aguardando_lancamento(ordem):
    if situacao_da_ordem(ordem) != Situacao.A_FATURAR or not ordem.liberada_para_cobranca_em:
        return None
    return dias_desde(ordem.liberada_para_cobranca_em)


def em_alerta(ordem):
    """Liberada há `DIAS_ALERTA_SEM_LANCAMENTO` dias ou mais sem lançamento."""
    dias = dias_aguardando_lancamento(ordem)
    return dias is not None and dias >= settings.DIAS_ALERTA_SEM_LANCAMENTO


def filtro_em_alerta():
    """Equivale a `em_alerta`, no banco: liberada antes do início do dia limite e ainda não lançada."""
    dias = settings.DIAS_ALERTA_SEM_LANCAMENTO
    limite = timezone.make_aware(datetime.combine(hoje() - timedelta(days=dias - 1), time.min))
    return FILTRO_SITUACAO[Situacao.A_FATURAR] & Q(liberada_para_cobranca_em__lt=limite)


def _ordens():
    return OrdemServico.objects.select_related(
        'cliente', 'criado_por', 'liberada_para_cobranca_por', 'cobranca_realizada_por',
    ).prefetch_related(Prefetch('servicos', queryset=Servico.objects.prefetch_related('tarefas')))


def aplicar_filtros(queryset, filtros):
    if filtros.get('cliente'):
        queryset = queryset.filter(cliente_id=filtros['cliente'])
    if filtros.get('de'):
        queryset = queryset.filter(data_venda__gte=filtros['de'])
    if filtros.get('ate'):
        queryset = queryset.filter(data_venda__lte=filtros['ate'])
    if filtros.get('tipo_condicao'):
        queryset = queryset.filter(tipo_condicao=filtros['tipo_condicao'])
    if filtros.get('forma_pagamento'):
        queryset = queryset.filter(forma_pagamento=filtros['forma_pagamento'])
    return queryset


def linha(ordem):
    """Tudo o que o financeiro precisa para faturar uma OS, sem abrir a observação."""
    return {
        'ordem_servico_id': ordem.id,
        'situacao': situacao_da_ordem(ordem),
        'status': ordem.status,
        'cliente_id': ordem.cliente_id,
        'cliente_nome': ordem.cliente.nome,
        'data_venda': ordem.data_venda,
        'vendido_por_nome': nome(ordem.criado_por),
        'valor': ordem.valor,
        'valor_mensal': ordem.valor_mensal,
        'tipo_condicao': ordem.tipo_condicao,
        'condicao_resumo': ordem.condicao_resumo,
        'forma_pagamento': ordem.forma_pagamento,
        'quantidade_parcelas': ordem.quantidade_parcelas,
        'data_acordada_cobranca': ordem.data_acordada_cobranca,
        'nome_contato_envio_nf': ordem.nome_contato_envio_nf,
        'contato_envio_nf': ordem.contato_envio_nf,
        'liberar_em': ordem.liberar_em,
        'liberada_para_cobranca_em': ordem.liberada_para_cobranca_em,
        'liberada_para_cobranca_por_nome': nome(ordem.liberada_para_cobranca_por),
        'referencia_lancamento': ordem.referencia_lancamento,
        'origem_lancamento': ordem.origem_lancamento,
        'data_cobranca': ordem.data_cobranca,
        'cobranca_realizada_por_nome': nome(ordem.cobranca_realizada_por),
        'dias_aguardando_lancamento': dias_aguardando_lancamento(ordem),
        'em_alerta': em_alerta(ordem),
        'andamento': andamento(ordem),
    }


def _contadores(queryset):
    contadores = {}
    for situacao in SITUACOES:
        agregado = queryset.filter(FILTRO_SITUACAO[situacao]).aggregate(quantidade=Count('id'), valor=Sum('valor'))
        contadores[situacao] = {'quantidade': agregado['quantidade'], 'valor': agregado['valor'] or 0}
    return contadores


def _ordenar(situacao, linhas):
    if situacao == Situacao.A_FATURAR:
        # A fila do financeiro: as liberadas há mais tempo primeiro.
        return sorted(linhas, key=lambda item: (item['liberada_para_cobranca_em'] is None,
                                                item['liberada_para_cobranca_em'] or timezone.now(),
                                                item['ordem_servico_id']))
    if situacao == Situacao.FATURADAS:
        return sorted(linhas, key=lambda item: (item['data_cobranca'] is not None, item['data_cobranca'],
                                                item['ordem_servico_id']), reverse=True)
    # Previsão: as mais perto de ser liberadas (maior parte dos serviços concluída) primeiro.
    def progresso(item):
        total = item['andamento']['total']
        return item['andamento']['concluido'] / total if total else 0
    return sorted(linhas, key=lambda item: (-progresso(item), item['data_venda'], item['ordem_servico_id']))


def cobrancas(situacao, filtros=None):
    """10.1: as OS de uma situação, com os contadores das três situações (sob os mesmos filtros)."""
    filtros = filtros or {}
    filtradas = aplicar_filtros(OrdemServico.objects.all(), filtros)
    ordens = aplicar_filtros(_ordens(), filtros).filter(FILTRO_SITUACAO[situacao])
    if filtros.get('em_alerta'):
        ordens = ordens.filter(filtro_em_alerta())
    return {
        'situacao': situacao,
        'contadores': _contadores(filtradas),
        'em_alerta': filtradas.filter(filtro_em_alerta()).count(),
        'ordens': _ordenar(situacao, [linha(ordem) for ordem in ordens]),
    }


def _quando(momento):
    """Data e hora no fuso local; o lançamento só tem data."""
    if momento is None:
        return None
    return timezone.localtime(momento).isoformat() if isinstance(momento, datetime) else momento.isoformat()


def _eventos_financeiros(ordem):
    """Venda, liberação e lançamento, a partir dos campos da OS. A linha do tempo completa vem na fase 11."""
    eventos = [{
        'quando': _quando(ordem.criada_em),
        'quem': nome(ordem.criado_por),
        'tipo': 'venda',
        'texto': f'Venda registrada: {ordem.condicao_resumo}',
    }]
    if ordem.liberada_para_cobranca:
        motivo = 'na venda' if ordem.liberar_em == LiberarEm.VENDA else 'na conclusão dos serviços'
        eventos.append({
            'quando': _quando(ordem.liberada_para_cobranca_em),
            'quem': nome(ordem.liberada_para_cobranca_por),
            'tipo': 'liberacao',
            'texto': f'Liberada para faturar ({motivo})',
        })
    if ordem.cobranca_realizada:
        referencia = f' (ref. {ordem.referencia_lancamento})' if ordem.referencia_lancamento else ''
        eventos.append({
            'quando': _quando(ordem.data_cobranca),
            'quem': nome(ordem.cobranca_realizada_por),
            'tipo': 'lancamento',
            'texto': f'Faturada{referencia}',
        })
    return eventos


def situacao_financeira(ordem):
    """10.4: a linha de cobrança da OS, os serviços com a etapa de cada um e os eventos financeiros."""
    ordem = _ordens().get(pk=ordem.pk)
    return {
        **linha(ordem),
        'observacao': ordem.observacao,
        'servicos': [{
            'id': servico.id,
            'descricao': servico.descricao,
            'etapa': etapa_do_servico(servico),
            'data_termino': servico.data_termino,
        } for servico in ordem.servicos.all()],
        'eventos': _eventos_financeiros(ordem),
    }
