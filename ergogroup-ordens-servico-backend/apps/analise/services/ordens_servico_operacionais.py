from datetime import date, datetime

from django.db.models import Count
from django.utils import timezone

from apps.analise.utils import agregar_por_mes, preencher_meses
from apps.ordens_servico.models import OrdemServicoOperacional
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional


def calcular_ordens_servico_operacionais(data_inicio, meses, hoje) -> dict:
    qs = OrdemServicoOperacional.objects.all()

    mes_atual_inicio = date(hoje.year, hoje.month, 1)
    if hoje.month == 1:
        mes_anterior_inicio = date(hoje.year - 1, 12, 1)
    else:
        mes_anterior_inicio = date(hoje.year, hoje.month - 1, 1)

    # criada_em é DateTimeField: usa make_aware para o filtro e TruncMonth + .date()
    # para a chave do mapa, pois TruncMonth em DateTimeField retorna datetime (não date)
    # e preencher_meses espera date(ano, mes, 1) como chave.
    _aware = lambda d: timezone.make_aware(datetime(d.year, d.month, d.day))

    # MySQL sem timezone tables instaladas retorna NULL em CONVERT_TZ(), quebrando
    # ExtractYear/Month e TruncMonth em DateTimeField. Agrega em Python para evitar
    # qualquer função de timezone no banco.
    criadas_map: dict[date, int] = {}
    for dt in qs.filter(criada_em__gte=_aware(data_inicio)).values_list('criada_em', flat=True):
        local_dt = timezone.localtime(dt)
        key = date(local_dt.year, local_dt.month, 1)
        criadas_map[key] = criadas_map.get(key, 0) + 1

    # data_termino é DateField → agregar_por_mes funciona diretamente
    finalizadas_qs = qs.filter(
        status=StatusOrdemServicoOperacional.FINALIZADA,
        data_termino__isnull=False,
        data_termino__gte=data_inicio,
    )
    finalizadas_map = agregar_por_mes(finalizadas_qs, campo_data='data_termino')

    total_revisao_cliente = qs.filter(revisao_cliente=True).count()
    revisoes_qs = qs.filter(revisao_cliente=True, cliente__isnull=False)
    revisoes_por_cliente = [
        {
            'cliente_id': i['cliente_id'],
            'cliente_nome': i['cliente__nome'],
            'total': i['total'],
            'percentual': (
                round(i['total'] / total_revisao_cliente * 100, 1) if total_revisao_cliente else None
            ),
        }
        for i in (
            revisoes_qs
            .values('cliente_id', 'cliente__nome')
            .annotate(total=Count('id'))
            .order_by('-total')[:10]
        )
    ]

    return {
        'total': qs.count(),
        'total_revisao_cliente': total_revisao_cliente,
        'criadas_por_mes': preencher_meses(meses, criadas_map),
        'finalizadas_por_mes': preencher_meses(meses, finalizadas_map),
        'criadas_mes_atual': qs.filter(criada_em__gte=_aware(mes_atual_inicio)).count(),
        'criadas_mes_anterior': qs.filter(
            criada_em__gte=_aware(mes_anterior_inicio),
            criada_em__lt=_aware(mes_atual_inicio),
        ).count(),
        'finalizadas_mes_atual': finalizadas_qs.filter(data_termino__gte=mes_atual_inicio).count(),
        'finalizadas_mes_anterior': finalizadas_qs.filter(
            data_termino__gte=mes_anterior_inicio,
            data_termino__lt=mes_atual_inicio,
        ).count(),
        'revisoes_por_cliente': revisoes_por_cliente,
    }


def calcular_tempo_por_catalogo_operacional() -> list[dict]:
    """Espelha services/tempos.py::calcular_tempo_por_catalogo, para OSO/CatalogoOperacional."""
    rows = (
        OrdemServicoOperacional.objects
        .filter(
            status=StatusOrdemServicoOperacional.FINALIZADA,
            catalogo_operacional__isnull=False,
            data_inicio__isnull=False,
            data_termino__isnull=False,
        )
        .values_list(
            'catalogo_operacional_id', 'catalogo_operacional__nome',
            'catalogo_operacional__horas_estimadas', 'catalogo_operacional__complexidade',
            'data_inicio', 'data_termino',
        )
    )
    mapa: dict[int, dict] = {}
    for cat_id, cat_nome, horas_estimadas, complexidade, inicio, termino in rows:
        dias = (termino - inicio).days
        if dias < 0:
            continue
        entry = mapa.setdefault(cat_id, {
            'nome': cat_nome,
            'horas_estimadas': horas_estimadas,
            'complexidade': complexidade,
            'dias': [],
        })
        entry['dias'].append(dias)
    resultado = sorted(
        [
            {
                'catalogo_id': cat_id,
                'catalogo_nome': data['nome'],
                'horas_estimadas': data['horas_estimadas'],
                'complexidade': data['complexidade'],
                'total_concluidos': len(data['dias']),
                'media_dias': round(sum(data['dias']) / len(data['dias']), 1),
            }
            for cat_id, data in mapa.items()
            if data['dias']
        ],
        key=lambda x: x['media_dias'],
        reverse=True,
    )
    return resultado
