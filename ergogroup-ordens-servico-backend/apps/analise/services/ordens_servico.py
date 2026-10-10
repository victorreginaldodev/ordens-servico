from datetime import date

from django.db.models import Count, Max, OuterRef, Subquery
from django.db.models.functions import ExtractMonth, ExtractYear

from apps.analise.utils import agregar_por_mes, preencher_meses
from apps.ordens_servico.models import OrdemServico, Servico
from apps.ordens_servico.models.servico import StatusServico


def calcular_ordens_servico(data_inicio, meses, hoje) -> dict:
    qs = OrdemServico.objects.all()

    mes_atual_inicio = date(hoje.year, hoje.month, 1)
    if hoje.month == 1:
        mes_anterior_inicio = date(hoje.year - 1, 12, 1)
    else:
        mes_anterior_inicio = date(hoje.year, hoje.month - 1, 1)

    abertas_map = agregar_por_mes(
        qs.filter(data_venda__gte=data_inicio),
        campo_data='data_venda',
    )
    ultimo_servico_data = (
        Servico.objects
        .filter(ordem_servico=OuterRef('pk'), status=StatusServico.CONCLUIDA, data_termino__isnull=False)
        .values('ordem_servico')
        .annotate(max_data=Max('data_termino'))
        .values('max_data')[:1]
    )
    concluidas_qs = (
        qs.filter(concluida=True)
        .annotate(data_conclusao=Subquery(ultimo_servico_data))
    )
    concluidas_com_data = concluidas_qs.filter(data_conclusao__isnull=False)
    concluidas_map = {
        date(item['ano'], item['mes'], 1): item['total']
        for item in (
            concluidas_com_data
            .annotate(
                ano=ExtractYear('data_conclusao'),
                mes=ExtractMonth('data_conclusao'),
            )
            .values('ano', 'mes')
            .annotate(total=Count('id'))
        )
    }

    return {
        'total': qs.count(),
        'total_concluidas': qs.filter(concluida=True).count(),
        'total_nao_concluidas': qs.filter(concluida=False).count(),
        'abertas_por_mes': preencher_meses(meses, abertas_map),
        'concluidas_por_mes': preencher_meses(meses, concluidas_map),
        'abertas_mes_atual': qs.filter(data_venda__gte=mes_atual_inicio).count(),
        'abertas_mes_anterior': qs.filter(
            data_venda__gte=mes_anterior_inicio,
            data_venda__lt=mes_atual_inicio,
        ).count(),
        'concluidas_mes_atual': concluidas_com_data.filter(
            data_conclusao__gte=mes_atual_inicio,
        ).count(),
        'concluidas_mes_anterior': concluidas_com_data.filter(
            data_conclusao__gte=mes_anterior_inicio,
            data_conclusao__lt=mes_atual_inicio,
        ).count(),
        'em_aberto': qs.exclude(status__in=['concluida', 'cancelada']).count(),
    }
