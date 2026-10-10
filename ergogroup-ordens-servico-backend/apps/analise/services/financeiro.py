from django.db.models import Avg, Count, Sum

from apps.analise.utils import agregar_por_mes, preencher_meses
from apps.ordens_servico.models import OrdemServico, TipoCondicao
from apps.ordens_servico.models.ordem_servico import Status
from apps.ordens_servico.services.financeiro import FILTRO_SITUACAO, SITUACOES, Situacao


def calcular_kpis() -> dict:
    qs = OrdemServico.objects.all()
    liberadas = qs.filter(cobranca_realizada=False, liberada_para_cobranca=True)

    total_cobrado = qs.filter(cobranca_realizada=True).aggregate(total=Sum('valor'))['total'] or 0
    total_para_cobrar = liberadas.aggregate(total=Sum('valor'))['total'] or 0
    total_sem_liberacao = (
        qs.filter(cobranca_realizada=False)
        .exclude(pk__in=liberadas.values('pk'))
        .aggregate(total=Sum('valor'))['total'] or 0
    )

    return {
        'total_cobrado': total_cobrado,
        'total_para_cobrar': total_para_cobrar,
        'total_sem_liberacao': total_sem_liberacao,
    }


def calcular_faturamento() -> dict:
    """A faturar, faturado e previsão (ADR 0008, 9), no total e por tipo de condição, e a receita recorrente
    mensal: a soma do valor mensal dos recorrentes não cancelados."""
    qs = OrdemServico.objects.all()

    def somas(queryset):
        return {situacao: queryset.filter(FILTRO_SITUACAO[situacao]).aggregate(total=Sum('valor'))['total'] or 0
                for situacao in SITUACOES}

    recorrentes = qs.filter(tipo_condicao=TipoCondicao.RECORRENTE).exclude(status=Status.CANCELADA)
    agregado_recorrente = recorrentes.aggregate(total=Sum('valor_mensal'), quantidade=Count('id'))
    return {
        'total_previsao': somas(qs)[Situacao.PREVISAO],
        'por_tipo_condicao': {tipo: somas(qs.filter(tipo_condicao=tipo)) for tipo in TipoCondicao.values},
        'receita_recorrente_mensal': agregado_recorrente['total'] or 0,
        'recorrentes_ativos': agregado_recorrente['quantidade'],
    }


def calcular_ticket_medio():
    return OrdemServico.objects.aggregate(media=Avg('valor'))['media']


def calcular_vendas_por_mes(data_inicio, meses) -> list[dict]:
    vendas_map = agregar_por_mes(
        OrdemServico.objects.filter(data_venda__gte=data_inicio),
        campo_data='data_venda',
        agregacao=Sum('valor'),
    )
    return preencher_meses(meses, vendas_map, default=0)


def calcular_clientes() -> dict:
    mais_cobranca = [
        {
            'cliente_id': i['cliente_id'],
            'cliente_nome': i['cliente__nome'],
            'total_valor_cobrado': i['total'] or 0,
        }
        for i in (
            OrdemServico.objects.filter(cobranca_realizada=True)
            .values('cliente_id', 'cliente__nome')
            .annotate(total=Sum('valor'))
            .order_by('-total')[:5]
        )
        if i['cliente_id'] is not None
    ]
    mais_vendas = [
        {
            'cliente_id': i['cliente_id'],
            'cliente_nome': i['cliente__nome'],
            'total_valor_vendas': i['total'] or 0,
        }
        for i in (
            OrdemServico.objects
            .values('cliente_id', 'cliente__nome')
            .annotate(total=Sum('valor'))
            .order_by('-total')[:10]
        )
        if i['cliente_id'] is not None
    ]
    return {'mais_cobranca': mais_cobranca, 'mais_vendas': mais_vendas}
