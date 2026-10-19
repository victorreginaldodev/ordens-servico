"""Blocos do financeiro (ADR 0008, 9; fase 10 do plano). "Faturar" é dar o OK no sistema (o lançamento) e
lançar no sistema financeiro externo; o sistema não controla parcelas."""
from datetime import datetime, time, timedelta
from functools import reduce
from operator import or_

from django.conf import settings
from django.db.models import Count, Prefetch, Q, Sum
from django.utils import timezone

from apps.ordens_servico.models import OrdemServico, OrdemServicoOperacional, Servico
from apps.ordens_servico.models.ordem_servico import Status
from apps.ordens_servico.services import cobranca_operacional, conferencia
from apps.ordens_servico.services.comercial import _responsaveis as responsaveis_do_servico
from apps.ordens_servico.services.comercial import andamento
from apps.ordens_servico.services.linha_do_tempo import linha_do_tempo_da_os
from apps.ordens_servico.services.execucao import dias_desde, etapa_do_servico, hoje, nome


class Situacao:
    A_FATURAR = 'a_faturar'
    FATURADAS = 'faturadas'
    PREVISAO = 'previsao'
    # Parâmetro da lista: as três situações numa chamada (a tela filtra e pagina no cliente; faturamento/04).
    TODAS = 'todas'


SITUACOES = [Situacao.A_FATURAR, Situacao.FATURADAS, Situacao.PREVISAO]
SITUACOES_DA_LISTA = SITUACOES + [Situacao.TODAS]
CATEGORIAS_DE_EVENTO = ['financeiro', 'execucao']

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
    servicos = Servico.objects.select_related('catalogo', 'setor', 'terminado_por').prefetch_related(
        'tarefas__responsavel',
    ).order_by('id')
    return OrdemServico.objects.select_related(
        'cliente', 'criado_por', 'liberada_para_cobranca_por', 'cobranca_realizada_por',
    ).prefetch_related(Prefetch('servicos', queryset=servicos))


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


def _pendentes(ordem):
    """Na previsão: o que falta para a OS liberar e com quem está."""
    return [{
        'servico_id': servico.id,
        'servico_nome': conferencia.nome_do_servico(servico),
        'setor_nome': servico.setor.nome if servico.setor_id else None,
        'etapa': etapa_do_servico(servico),
        'responsaveis': conferencia.responsaveis_pendentes(servico),
        'dias_sem_movimentacao': servico.dias_sem_movimentacao,
    } for servico in conferencia.servicos_pendentes(ordem)]


def _ultima_movimentacao(ordem):
    momentos = [s.ultima_movimentacao_em for s in ordem.servicos.all() if s.ultima_movimentacao_em]
    return max(momentos) if momentos else None


def linha(ordem, pendencias=None):
    """Tudo o que o financeiro precisa para faturar uma OS, sem abrir a observação. `pendencias`: os códigos
    da conferência em que a OS aparece."""
    return {
        'ordem_servico_id': ordem.id,
        'situacao': situacao_da_ordem(ordem),
        'status': ordem.status,
        'cliente_id': ordem.cliente_id,
        'cliente_nome': ordem.cliente.nome,
        'data_venda': ordem.data_venda,
        'vendido_por_nome': nome(ordem.criado_por),
        'valor': ordem.valor,
        'tipo_condicao': ordem.tipo_condicao,
        'condicao_resumo': ordem.condicao_resumo,
        'forma_pagamento': ordem.forma_pagamento,
        'quantidade_parcelas': ordem.quantidade_parcelas,
        'data_acordada_cobranca': ordem.data_acordada_cobranca,
        'vencimento_resumo': ordem.vencimento_resumo,
        'vencimento_dias_apos_nota': ordem.vencimento_dias_apos_nota,
        'dia_vencimento_demais': ordem.dia_vencimento_demais,
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
        'pendentes': _pendentes(ordem) if situacao_da_ordem(ordem) == Situacao.PREVISAO else [],
        'ultima_movimentacao_em': _ultima_movimentacao(ordem),
        'pendencias': pendencias or [],
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


def _filtro_faturadas(filtros):
    """As faturadas podem ser limitadas pela data do lançamento (`faturada_de`/`faturada_ate`), para a lista não
    crescer sem fim. As outras situações não são afetadas."""
    filtro = FILTRO_SITUACAO[Situacao.FATURADAS]
    if filtros.get('faturada_de'):
        filtro &= Q(data_cobranca__gte=filtros['faturada_de'])
    if filtros.get('faturada_ate'):
        filtro &= Q(data_cobranca__lte=filtros['faturada_ate'])
    return filtro


def cobrancas(situacao, filtros=None):
    """10.1: as OS de uma situação (ou das três, com `todas`), com os contadores das três situações (sob os
    mesmos filtros) e os códigos da conferência de cada OS."""
    filtros = filtros or {}
    filtradas = aplicar_filtros(OrdemServico.objects.all(), filtros)
    filtro = {
        Situacao.A_FATURAR: FILTRO_SITUACAO[Situacao.A_FATURAR],
        Situacao.PREVISAO: FILTRO_SITUACAO[Situacao.PREVISAO],
        Situacao.FATURADAS: _filtro_faturadas(filtros),
    }
    situacoes = SITUACOES if situacao == Situacao.TODAS else [situacao]
    ordens = aplicar_filtros(_ordens(), filtros).filter(reduce(or_, [filtro[s] for s in situacoes]))
    if filtros.get('em_alerta'):
        ordens = ordens.filter(filtro_em_alerta())
    ordens = list(ordens)
    itens = conferencia.calcular(
        OrdemServico.objects.filter(pk__in=[o.pk for o in ordens]), OrdemServicoOperacional.objects.all(),
    )
    pendencias = conferencia.pendencias_por_ordem(itens)
    operacionais = cobranca_operacional.cobrancas(situacoes, filtros, conferencia.pendencias_por_oso(itens))
    linhas = [linha(ordem, pendencias.get(ordem.pk)) for ordem in ordens]
    contadores = _contadores(filtradas)
    if filtros.get('faturada_de') or filtros.get('faturada_ate'):
        agregado = filtradas.filter(filtro[Situacao.FATURADAS]).aggregate(quantidade=Count('id'), valor=Sum('valor'))
        contadores[Situacao.FATURADAS] = {'quantidade': agregado['quantidade'], 'valor': agregado['valor'] or 0}
    return {
        'situacao': situacao,
        'contadores': contadores,
        'em_alerta': filtradas.filter(filtro_em_alerta()).count(),
        'dias_alerta_sem_lancamento': settings.DIAS_ALERTA_SEM_LANCAMENTO,
        'ordens': [item for s in situacoes for item in _ordenar(s, [l for l in linhas if l['situacao'] == s])],
        'operacionais': operacionais['linhas'],
        'contadores_operacionais': operacionais['contadores'],
        'operacionais_em_alerta': operacionais['em_alerta'],
    }


# Eventos da linha do tempo que interessam ao financeiro; os demais são da execução (filtro "Financeiro | Tudo").
TIPOS_FINANCEIROS = {
    'historico_anterior', 'venda', 'venda_alterada', 'condicao_alterada', 'liberacao', 'lancamento', 'os_concluida',
    'os_cancelada', 'os_reaberta', 'servico_cancelado', 'servico_excluido',
}


def _servicos_realizados(ordem):
    """Por serviço: setor, quem executou (as tarefas), início, término e quem finalizou."""
    return [{
        'id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'descricao': servico.descricao,
        'setor_nome': servico.setor.nome if servico.setor_id else None,
        'etapa': etapa_do_servico(servico),
        'prazo': servico.prazo,
        'data_inicio': servico.data_inicio,
        'data_termino': servico.data_termino,
        'terminado_por_nome': nome(servico.terminado_por),
        'responsaveis': responsaveis_do_servico(servico),
        'dias_sem_movimentacao': servico.dias_sem_movimentacao if servico.ativo else None,
    } for servico in ordem.servicos.all()]


def _dados_do_cliente(cliente):
    """Tudo o que o cadastro tem do cliente, para conferir na hora de faturar (faturamento/04, seção 9)."""
    return {
        'id': cliente.id,
        'nome': cliente.nome,
        'tipo_inscricao': cliente.tipo_inscricao,
        'tipo_inscricao_display': cliente.get_tipo_inscricao_display() if cliente.tipo_inscricao else None,
        'numero_inscricao': cliente.numero_inscricao,
        'tipo_cliente': cliente.tipo_cliente,
        'tipo_cliente_display': cliente.get_tipo_cliente_display() if cliente.tipo_cliente else None,
        'nome_representante': cliente.nome_representante,
        'setor_representante': cliente.setor_representante,
        'email_representante': cliente.email_representante,
        'contato_representante': cliente.contato_representante,
        'observacao': cliente.observacao,
        'ativo': cliente.ativo,
    }


def situacao_financeira(ordem, usuario):
    """10.4, o resumo para faturar (faturamento/04): a linha de cobrança da OS, os serviços realizados, as
    pendências da conferência e a linha do tempo, com a categoria de cada evento."""
    ordem = _ordens().get(pk=ordem.pk)
    pendencias = conferencia.pendencias_da_ordem(ordem)
    # Do mais recente ao mais antigo; no mesmo instante, a ordem da tradução ao contrário (a liberação na venda
    # vem antes da venda).
    eventos = [evento for _, evento in sorted(
        enumerate(linha_do_tempo_da_os(ordem, usuario)), key=lambda par: (par[1]['quando'], par[0]), reverse=True,
    )]
    return {
        **linha(ordem, [p['codigo'] for p in pendencias]),
        'observacao': ordem.observacao,
        'cliente': _dados_do_cliente(ordem.cliente),
        'servicos': _servicos_realizados(ordem),
        'detalhe_pendencias': pendencias,
        'eventos': [{
            **evento,
            'categoria': 'financeiro' if evento['tipo'] in TIPOS_FINANCEIROS else 'execucao',
        } for evento in eventos],
    }
