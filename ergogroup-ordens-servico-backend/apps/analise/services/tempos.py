from django.db.models import Max, Q
from django.utils import timezone

from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.servico import StatusServico


def calcular_tempos_medios(data_inicio) -> dict:
    # Todos os pares (venda, fim_real) de OS concluídas — sem filtro de data.
    # A distribuição e a média global precisam refletir o histórico completo do banco.
    todos_pares = list(
        OrdemServico.objects
        .filter(concluida=True)
        .annotate(
            data_fim_real=Max(
                'servicos__data_termino',
                filter=Q(servicos__status='concluida'),
            )
        )
        .filter(data_fim_real__isnull=False)
        .values_list('data_venda', 'data_fim_real')
    )

    servicos_concluidos = Servico.objects.filter(
        status=StatusServico.CONCLUIDA,
        data_inicio__isnull=False,
        data_termino__isnull=False,
    )
    servico_media = _media_dias(servicos_concluidos.values_list('data_inicio', 'data_termino'))

    tarefas_com_inicio = Tarefa.objects.filter(
        data_inicio__isnull=False,
    )
    lead_time_media = _media_dias(
        (timezone.localtime(criada_em).date(), inicio)
        for inicio, criada_em in tarefas_com_inicio.values_list('data_inicio', 'criada_em')
    )

    return {
        'os_criacao_para_encerramento_dias': _media_dias(todos_pares),
        'os_criacao_para_conclusao_dias': _media_dias_criacao_para_conclusao_os(),
        'os_total_com_data': len(todos_pares),
        'os_distribuicao_tempo': _distribuicao_tempo_os(todos_pares),
        'servicos_inicio_para_fim_dias': servico_media,
        'tarefa_criacao_para_inicio_dias': lead_time_media,
        'tempo_por_catalogo_servico': calcular_tempo_por_catalogo(),
    }


def calcular_tempo_por_catalogo() -> list[dict]:
    rows = (
        Servico.objects
        .filter(
            status=StatusServico.CONCLUIDA,
            catalogo__isnull=False,
            data_inicio__isnull=False,
            data_termino__isnull=False,
        )
        .values_list(
            'catalogo_id', 'catalogo__nome', 'data_inicio', 'data_termino',
        )
    )
    mapa: dict[int, dict] = {}
    for cat_id, cat_nome, inicio, termino in rows:
        dias = (termino - inicio).days
        if dias < 0:
            continue
        entry = mapa.setdefault(cat_id, {
            'nome': cat_nome,
            'dias': [],
        })
        entry['dias'].append(dias)
    resultado = sorted(
        [
            {
                'catalogo_id': cat_id,
                'catalogo_nome': data['nome'],
                # Horas e complexidade saíram do catálogo; as chaves ficam por compatibilidade
                # com o formato compartilhado com o catálogo operacional.
                'horas_estimadas': None,
                'complexidade': None,
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


def _media_dias(pares_datas, inclusivo=False) -> float | None:
    diffs = [
        (fim - inicio).days + (1 if inclusivo else 0)
        for inicio, fim in pares_datas
        if inicio and fim
    ]
    if not diffs:
        return None
    return round(sum(diffs) / len(diffs), 1)


def _media_dias_criacao_para_conclusao_os() -> float | None:
    pares = (
        (
            timezone.localtime(criada_em).date(),
            timezone.localtime(conclusao_em).date(),
        )
        for criada_em, conclusao_em in OrdemServico.objects
        .filter(liberada_para_cobranca_em__isnull=False)
        .values_list('criada_em', 'liberada_para_cobranca_em')
    )
    return _media_dias(pares, inclusivo=True)


def _distribuicao_tempo_os(pares: list[tuple]) -> dict:
    buckets = {'ate_7': 0, 'de_8_a_15': 0, 'de_16_a_30': 0, 'de_31_a_60': 0, 'acima_60': 0}
    for criacao, fim in pares:
        if criacao and fim:
            dias = (fim - criacao).days
            if dias <= 7:
                buckets['ate_7'] += 1
            elif dias <= 15:
                buckets['de_8_a_15'] += 1
            elif dias <= 30:
                buckets['de_16_a_30'] += 1
            elif dias <= 60:
                buckets['de_31_a_60'] += 1
            else:
                buckets['acima_60'] += 1
    return buckets
