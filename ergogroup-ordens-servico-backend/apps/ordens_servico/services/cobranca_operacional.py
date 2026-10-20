"""Cobrança das OS operacionais no financeiro (19/10/2026, wireframe `lote7-cobrancas-oso` aprovado).

A OSO entra nas Cobranças quando gera cobrança (regra do catálogo operacional, ADR 0011). As situações
seguem as da venda:

- **previsão** (Em execução): gera cobrança e ainda não foi finalizada;
- **a faturar**: finalizada, liberada (`data_liberacao_cobranca`) e sem lançamento;
- **faturadas**: com o lançamento registrado (`cobranca_realizada`).

A OSO não tem valor, condição nem vencimento: o financeiro define o valor no lançamento.
"""
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from apps.ordens_servico.models import OrdemServicoOperacional
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional
from apps.ordens_servico.services.execucao import dias_desde, hoje, nome

A_FATURAR = 'a_faturar'
FATURADAS = 'faturadas'
PREVISAO = 'previsao'

FILTRO_SITUACAO = {
    PREVISAO: Q(gera_cobranca=True, cobranca_realizada=False) & ~Q(status=StatusOrdemServicoOperacional.FINALIZADA),
    A_FATURAR: Q(gera_cobranca=True, cobranca_realizada=False, data_liberacao_cobranca__isnull=False),
    FATURADAS: Q(cobranca_realizada=True),
}


def situacao_da_oso(oso):
    if oso.cobranca_realizada:
        return FATURADAS
    if not oso.gera_cobranca:
        return None
    if oso.data_liberacao_cobranca:
        return A_FATURAR
    # Finalizada sem liberação é dado fora de sincronia (garantia da conferência); fica na previsão até corrigir.
    return PREVISAO


def dias_aguardando_lancamento(oso):
    if situacao_da_oso(oso) != A_FATURAR:
        return None
    return dias_desde(oso.data_liberacao_cobranca)


def em_alerta(oso):
    dias = dias_aguardando_lancamento(oso)
    return dias is not None and dias >= settings.DIAS_ALERTA_SEM_LANCAMENTO


def filtro_em_alerta():
    dias = settings.DIAS_ALERTA_SEM_LANCAMENTO
    limite = timezone.make_aware(datetime.combine(hoje() - timedelta(days=dias - 1), time.min))
    return FILTRO_SITUACAO[A_FATURAR] & Q(data_liberacao_cobranca__lt=limite)


def referencia(oso):
    """A referência do lançamento; nas cobranças anteriores a 19/10/2026, a NF do campo antigo."""
    if oso.referencia_lancamento:
        return oso.referencia_lancamento
    nf = (oso.numero_nf or '').strip()
    return f'NF {nf}' if nf and nf != '0' else None


def osos():
    return OrdemServicoOperacional.objects.select_related(
        'cliente', 'catalogo_operacional', 'responsavel', 'liberada_cobranca_por', 'cobranca_realizada_por',
    )


def linha(oso, pendencias=None):
    """O que o financeiro precisa para faturar uma OSO. `pendencias`: os códigos da conferência."""
    return {
        'ordem_servico_operacional_id': oso.id,
        'situacao': situacao_da_oso(oso),
        'status': oso.status,
        'cliente_id': oso.cliente_id,
        'cliente_nome': oso.cliente.nome,
        'catalogo_operacional_nome': oso.catalogo_operacional.nome,
        'regra_de_cobranca': oso.regra_de_cobranca,
        'revisao_cliente': oso.revisao_cliente,
        'quantidade': oso.quantidade,
        'descricao': oso.descricao,
        'responsavel_nome': nome(oso.responsavel),
        'data_recebimento': oso.data_recebimento,
        'data_inicio': oso.data_inicio,
        'data_termino': oso.data_termino,
        'prazo': oso.prazo,
        'liberada_para_cobranca_em': oso.data_liberacao_cobranca,
        'liberada_para_cobranca_por_nome': nome(oso.liberada_cobranca_por),
        'referencia_lancamento': referencia(oso),
        'data_cobranca': oso.data_cobranca,
        'cobranca_realizada_por_nome': nome(oso.cobranca_realizada_por),
        'dias_aguardando_lancamento': dias_aguardando_lancamento(oso),
        'em_alerta': em_alerta(oso),
        'dias_sem_movimentacao': (
            dias_desde(oso.atualizado_em) if situacao_da_oso(oso) == PREVISAO and oso.atualizado_em else None
        ),
        'criada_em': oso.criada_em,
        'pendencias': pendencias or [],
    }


def _filtradas(filtros):
    queryset = OrdemServicoOperacional.objects.all()
    # Condição e forma de pagamento são da venda: com esses filtros, nenhuma OSO entra.
    if filtros.get('tipo_condicao') or filtros.get('forma_pagamento'):
        return queryset.none()
    if filtros.get('cliente'):
        queryset = queryset.filter(cliente_id=filtros['cliente'])
    if filtros.get('de'):
        queryset = queryset.filter(data_recebimento__gte=filtros['de'])
    if filtros.get('ate'):
        queryset = queryset.filter(data_recebimento__lte=filtros['ate'])
    return queryset


def _filtro_faturadas(filtros):
    filtro = FILTRO_SITUACAO[FATURADAS]
    if filtros.get('faturada_de'):
        filtro &= Q(data_cobranca__gte=filtros['faturada_de'])
    if filtros.get('faturada_ate'):
        filtro &= Q(data_cobranca__lte=filtros['faturada_ate'])
    return filtro


def _ordenar(situacao, linhas):
    if situacao == A_FATURAR:
        return sorted(linhas, key=lambda i: (i['liberada_para_cobranca_em'], i['ordem_servico_operacional_id']))
    if situacao == FATURADAS:
        return sorted(linhas, key=lambda i: (i['data_cobranca'] is not None, i['data_cobranca'],
                                             i['ordem_servico_operacional_id']), reverse=True)
    return sorted(linhas, key=lambda i: (i['data_recebimento'] is None, i['data_recebimento'],
                                         i['ordem_servico_operacional_id']))


def cobrancas(situacoes, filtros, pendencias):
    """As OSOs das situações pedidas e as quantidades das três situações, sob os mesmos filtros."""
    filtradas = _filtradas(filtros)
    filtro = {PREVISAO: FILTRO_SITUACAO[PREVISAO], A_FATURAR: FILTRO_SITUACAO[A_FATURAR],
              FATURADAS: _filtro_faturadas(filtros)}
    selecionadas = Q()
    for situacao in situacoes:
        selecionadas |= filtro[situacao]
    lista = osos().filter(pk__in=filtradas.values('pk')).filter(selecionadas)
    if filtros.get('em_alerta'):
        lista = lista.filter(filtro_em_alerta())
    linhas = [linha(oso, pendencias.get(oso.pk)) for oso in lista]
    return {
        'linhas': [item for s in situacoes for item in _ordenar(s, [l for l in linhas if l['situacao'] == s])],
        'contadores': {s: filtradas.filter(filtro[s]).count() for s in filtro},
        'em_alerta': filtradas.filter(filtro_em_alerta()).count(),
    }


def historico(oso):
    """Os marcos da OSO que interessam ao financeiro, do mais recente ao mais antigo."""
    marcos = [
        (oso.criada_em, 'criada', 'OS operacional criada'
         + (' · gera cobrança pela regra do catálogo' if oso.gera_cobranca else ' · não gera cobrança'), None),
    ]
    if oso.data_inicio:
        marcos.append((oso.data_inicio, 'iniciada', 'Execução iniciada', nome(oso.responsavel)))
    if oso.data_termino:
        marcos.append((oso.data_termino, 'finalizada', 'Execução finalizada', nome(oso.responsavel)))
    if oso.data_liberacao_cobranca:
        marcos.append((oso.data_liberacao_cobranca, 'liberacao', 'Liberada para cobrança',
                       nome(oso.liberada_cobranca_por)))
    if oso.cobranca_realizada:
        marcos.append((oso.data_cobranca, 'lancamento',
                       f'Faturada{f" · {referencia(oso)}" if referencia(oso) else ""}',
                       nome(oso.cobranca_realizada_por)))

    def momento(valor):
        if valor is None:
            return datetime.min
        if isinstance(valor, datetime):
            return timezone.localtime(valor).replace(tzinfo=None)
        return datetime.combine(valor, time.min)

    ordenados = sorted(marcos, key=lambda m: momento(m[0]), reverse=True)
    return [{
        'quando': timezone.localdate(q) if isinstance(q, datetime) else q,
        'tipo': tipo, 'descricao': descricao, 'pessoa_nome': pessoa,
    } for q, tipo, descricao, pessoa in ordenados]


def situacao_financeira(oso):
    """O resumo para faturar a OSO: a linha, o cliente completo, a regra de cobrança, as pendências e o
    histórico."""
    from apps.ordens_servico.services import conferencia
    from apps.ordens_servico.services.financeiro import _dados_do_cliente

    oso = osos().get(pk=oso.pk)
    pendencias = conferencia.pendencias_da_oso(oso)
    return {
        **linha(oso, [p['codigo'] for p in pendencias]),
        'gera_cobranca': oso.gera_cobranca,
        'cliente': _dados_do_cliente(oso.cliente),
        'detalhe_pendencias': pendencias,
        'historico': historico(oso),
    }
