from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.analise.utils import preencher_meses
from apps.organizacoes.permissoes import Permissao, tem_permissao
from apps.ordens_servico.models import OrdemServicoOperacional, Prioridade, Tarefa
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional
from apps.ordens_servico.models.tarefa import StatusTarefa


def calcular_por_tecnico(data_inicio, meses, usuario) -> list[dict]:
    hoje = timezone.localdate()

    # Histórico completo — para KPIs absolutos e tempo médio
    tarefas_hist_qs = Tarefa.objects.filter(
        status=StatusTarefa.CONCLUIDA,
        data_termino__isnull=False,
    )
    minios_hist_qs = OrdemServicoOperacional.objects.filter(
        status=StatusOrdemServicoOperacional.FINALIZADA,
        data_termino__isnull=False,
    )
    # Últimos 12 meses — apenas para o gráfico mensal
    tarefas_concluidas_qs = tarefas_hist_qs.filter(data_termino__gte=data_inicio)
    minios_concluidas_qs = minios_hist_qs.filter(data_termino__gte=data_inicio)

    tarefas_abertas_qs = Tarefa.objects.filter(
        status__in=[StatusTarefa.ABERTA, StatusTarefa.EM_ANDAMENTO],
    )
    minios_abertas_qs = OrdemServicoOperacional.objects.filter(
        status__in=[StatusOrdemServicoOperacional.NAO_INICIADO, StatusOrdemServicoOperacional.EM_ANDAMENTO],
    )
    tarefas_atrasadas_qs = tarefas_abertas_qs.filter(prazo__isnull=False, prazo__lt=hoje)
    minios_atrasadas_qs = minios_abertas_qs.filter(prazo__isnull=False, prazo__lt=hoje)
    tarefas_alta_prioridade_qs = tarefas_abertas_qs.filter(prioridade=Prioridade.ALTA)
    minios_alta_prioridade_qs = minios_abertas_qs.filter(prioridade=Prioridade.ALTA)

    if not tem_permissao(usuario, Permissao.INDICADORES_VER_GERAL):
        tarefas_hist_qs = tarefas_hist_qs.filter(responsavel=usuario)
        minios_hist_qs = minios_hist_qs.filter(responsavel=usuario)
        tarefas_concluidas_qs = tarefas_concluidas_qs.filter(responsavel=usuario)
        minios_concluidas_qs = minios_concluidas_qs.filter(responsavel=usuario)
        tarefas_abertas_qs = tarefas_abertas_qs.filter(responsavel=usuario)
        minios_abertas_qs = minios_abertas_qs.filter(responsavel=usuario)
        tarefas_atrasadas_qs = tarefas_atrasadas_qs.filter(responsavel=usuario)
        minios_atrasadas_qs = minios_atrasadas_qs.filter(responsavel=usuario)
        tarefas_alta_prioridade_qs = tarefas_alta_prioridade_qs.filter(responsavel=usuario)
        minios_alta_prioridade_qs = minios_alta_prioridade_qs.filter(responsavel=usuario)

    dados = {}
    duracoes_por_tecnico = {}
    com_prazo_tarefas_por_tecnico = {}
    no_prazo_tarefas_por_tecnico = {}
    com_prazo_minios_por_tecnico = {}
    no_prazo_minios_por_tecnico = {}
    tarefas_concluidas_por_mes = _mapa_por_responsavel_e_mes(tarefas_concluidas_qs, 'data_termino')
    minios_concluidas_por_mes = _mapa_por_responsavel_e_mes(minios_concluidas_qs, 'data_termino')

    # KPIs e tempo médio usam o histórico completo
    for responsavel_id, nome, inicio, termino, prazo in tarefas_hist_qs.values_list(
        'responsavel_id', 'responsavel__nome_completo', 'data_inicio', 'data_termino', 'prazo',
    ):
        entry = dados.setdefault(responsavel_id, _linha_tecnico(responsavel_id, nome))
        entry['tarefas_concluidas'] += 1
        if inicio and termino:
            duracoes_por_tecnico.setdefault(responsavel_id, []).append((termino - inicio).days)
        if prazo is not None:
            com_prazo_tarefas_por_tecnico[responsavel_id] = com_prazo_tarefas_por_tecnico.get(responsavel_id, 0) + 1
            if termino is not None and termino <= prazo:
                no_prazo_tarefas_por_tecnico[responsavel_id] = no_prazo_tarefas_por_tecnico.get(responsavel_id, 0) + 1

    for responsavel_id, nome, termino, prazo in minios_hist_qs.values_list(
        'responsavel_id', 'responsavel__nome_completo', 'data_termino', 'prazo',
    ):
        entry = dados.setdefault(responsavel_id, _linha_tecnico(responsavel_id, nome))
        entry['mini_os_concluidas'] += 1
        if prazo is not None:
            com_prazo_minios_por_tecnico[responsavel_id] = com_prazo_minios_por_tecnico.get(responsavel_id, 0) + 1
            if termino is not None and termino <= prazo:
                no_prazo_minios_por_tecnico[responsavel_id] = no_prazo_minios_por_tecnico.get(responsavel_id, 0) + 1

    for item in tarefas_abertas_qs.values('responsavel_id', 'responsavel__nome_completo').annotate(total=Count('id')):
        entry = dados.setdefault(
            item['responsavel_id'], _linha_tecnico(item['responsavel_id'], item['responsavel__nome_completo'])
        )
        entry['tarefas_em_aberto'] = item['total']

    for item in minios_abertas_qs.values('responsavel_id', 'responsavel__nome_completo').annotate(total=Count('id')):
        entry = dados.setdefault(
            item['responsavel_id'], _linha_tecnico(item['responsavel_id'], item['responsavel__nome_completo'])
        )
        entry['mini_os_em_aberto'] = item['total']

    for item in tarefas_atrasadas_qs.values('responsavel_id', 'responsavel__nome_completo').annotate(total=Count('id')):
        entry = dados.setdefault(
            item['responsavel_id'], _linha_tecnico(item['responsavel_id'], item['responsavel__nome_completo'])
        )
        entry['tarefas_atrasadas'] = item['total']

    for item in minios_atrasadas_qs.values('responsavel_id', 'responsavel__nome_completo').annotate(total=Count('id')):
        entry = dados.setdefault(
            item['responsavel_id'], _linha_tecnico(item['responsavel_id'], item['responsavel__nome_completo'])
        )
        entry['mini_os_atrasadas'] = item['total']

    for item in tarefas_alta_prioridade_qs.values('responsavel_id', 'responsavel__nome_completo').annotate(total=Count('id')):
        entry = dados.setdefault(
            item['responsavel_id'], _linha_tecnico(item['responsavel_id'], item['responsavel__nome_completo'])
        )
        entry['tarefas_alta_prioridade_abertas'] = item['total']

    for item in minios_alta_prioridade_qs.values('responsavel_id', 'responsavel__nome_completo').annotate(total=Count('id')):
        entry = dados.setdefault(
            item['responsavel_id'], _linha_tecnico(item['responsavel_id'], item['responsavel__nome_completo'])
        )
        entry['mini_os_alta_prioridade_abertas'] = item['total']

    for responsavel_id, entry in dados.items():
        duracoes = duracoes_por_tecnico.get(responsavel_id) or []
        entry['tempo_medio_tarefa_dias'] = (
            round(sum(duracoes) / len(duracoes), 1) if duracoes else None
        )
        entry['tarefas_concluidas_por_mes'] = preencher_meses(
            meses, tarefas_concluidas_por_mes.get(responsavel_id, {})
        )
        entry['mini_os_concluidas_por_mes'] = preencher_meses(
            meses, minios_concluidas_por_mes.get(responsavel_id, {})
        )
        com_prazo_t = com_prazo_tarefas_por_tecnico.get(responsavel_id, 0)
        no_prazo_t = no_prazo_tarefas_por_tecnico.get(responsavel_id, 0)
        entry['taxa_cumprimento_prazo_tarefas'] = (
            round(no_prazo_t / com_prazo_t * 100, 1) if com_prazo_t else None
        )
        com_prazo_m = com_prazo_minios_por_tecnico.get(responsavel_id, 0)
        no_prazo_m = no_prazo_minios_por_tecnico.get(responsavel_id, 0)
        entry['taxa_cumprimento_prazo_minios'] = (
            round(no_prazo_m / com_prazo_m * 100, 1) if com_prazo_m else None
        )

    return sorted(dados.values(), key=lambda d: d['tecnico_nome'] or '')


def _mapa_por_responsavel_e_mes(queryset, campo_data: str) -> dict:
    mapa = {}
    for item in (
        queryset
        .annotate(mes=TruncMonth(campo_data))
        .values('responsavel_id', 'mes')
        .annotate(total=Count('id'))
    ):
        mapa.setdefault(item['responsavel_id'], {})[item['mes']] = item['total']
    return mapa


def _linha_tecnico(responsavel_id, nome):
    return {
        'tecnico_id': responsavel_id,
        'tecnico_nome': nome,
        'tarefas_concluidas': 0,
        'tempo_medio_tarefa_dias': None,
        'mini_os_concluidas': 0,
        'tarefas_em_aberto': 0,
        'mini_os_em_aberto': 0,
        'tarefas_atrasadas': 0,
        'mini_os_atrasadas': 0,
        'tarefas_alta_prioridade_abertas': 0,
        'mini_os_alta_prioridade_abertas': 0,
        'tarefas_concluidas_por_mes': [],
        'mini_os_concluidas_por_mes': [],
        'taxa_cumprimento_prazo_tarefas': None,
        'taxa_cumprimento_prazo_minios': None,
    }
