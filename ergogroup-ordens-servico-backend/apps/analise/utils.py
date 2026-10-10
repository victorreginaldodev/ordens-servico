from datetime import date

from django.db.models import Count
from django.db.models.functions import TruncMonth


def gerar_intervalo_meses(data_base: date, quantidade: int) -> list:
    meses, ano, mes = [], data_base.year, data_base.month
    for _ in range(quantidade):
        meses.append({'ano': ano, 'mes': mes})
        mes -= 1
        if mes == 0:
            mes, ano = 12, ano - 1
    return list(reversed(meses))


def agregar_por_mes(queryset, campo_data: str, agregacao=None) -> dict:
    if agregacao is None:
        agregacao = Count('id')
    return {
        item['mes']: item['total']
        for item in (
            queryset
            .annotate(mes=TruncMonth(campo_data))
            .values('mes')
            .annotate(total=agregacao)
        )
    }


def preencher_meses(meses: list, mapa: dict, default=0) -> list:
    return [
        {
            'ano': m['ano'],
            'mes': m['mes'],
            'total': mapa.get(date(m['ano'], m['mes'], 1), default),
        }
        for m in meses
    ]
