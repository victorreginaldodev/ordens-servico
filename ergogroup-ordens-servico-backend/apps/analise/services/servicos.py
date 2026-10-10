from django.db.models import Count

from apps.analise.utils import agregar_por_mes, preencher_meses
from apps.ordens_servico.models import Servico
from apps.ordens_servico.models.servico import StatusServico


def calcular_servicos(data_inicio, meses) -> dict:
    concluidos = Servico.objects.filter(
        status=StatusServico.CONCLUIDA,
        data_termino__isnull=False,
        data_termino__gte=data_inicio,
    )
    por_mes_map = agregar_por_mes(concluidos, campo_data='data_termino')

    principais = list(
        Servico.objects
        .filter(catalogo__isnull=False)
        .values('catalogo_id', 'catalogo__nome')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    # Lista não paginada/cortada: a soma dos próprios itens é o total real da população filtrada.
    total_com_catalogo = sum(i['total'] for i in principais)
    principais_por_quantidade = [
        {
            'catalogo_id': i['catalogo_id'],
            'catalogo_nome': i['catalogo__nome'],
            'total': i['total'],
            'percentual': round(i['total'] / total_com_catalogo * 100, 1) if total_com_catalogo else None,
        }
        for i in principais
    ]

    por_status = [
        {
            'status': item['status'],
            'status_display': dict(StatusServico.choices).get(item['status'], item['status']),
            'total': item['total'],
        }
        for item in Servico.objects.values('status').annotate(total=Count('id'))
    ]

    return {
        'concluidos_ultimos_12_meses_total': concluidos.count(),
        'concluidos_por_mes': preencher_meses(meses, por_mes_map),
        'principais_por_quantidade': principais_por_quantidade,
        'por_status': por_status,
    }
