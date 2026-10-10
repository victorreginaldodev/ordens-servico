from datetime import datetime, time

from django.utils import timezone

from apps.ordens_servico.models import Servico, Tarefa
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa


def calcular_taxa_cancelamento(data_inicio) -> dict:
    # Comparação direta com datetime timezone-aware (em vez de `__date`),
    # pois `__date` em DateTimeField exige CONVERT_TZ do MySQL, que falha
    # silenciosamente (retorna NULL) quando as tabelas de timezone do
    # servidor não estão carregadas.
    limite = timezone.make_aware(datetime.combine(data_inicio, time.min))
    tarefas_periodo = Tarefa.objects.filter(criada_em__gte=limite)
    servicos_periodo = Servico.objects.filter(criado_em__gte=limite)
    return {
        'tarefas': _bloco_cancelamento(tarefas_periodo, StatusTarefa.CANCELADA),
        'servicos': _bloco_cancelamento(servicos_periodo, StatusServico.CANCELADO),
    }


def calcular_cancelamento_por_catalogo(data_inicio) -> list[dict]:
    # Só Serviço/Catálogo: Tarefa não tem catálogo próprio (herdaria do Serviço e
    # duplicaria a mesma quebra um nível abaixo — mesma assimetria já existente em
    # calcular_tempo_por_catalogo, que também só existe para Serviço).
    limite = timezone.make_aware(datetime.combine(data_inicio, time.min))
    servicos_periodo = Servico.objects.filter(criado_em__gte=limite, catalogo__isnull=False)

    linhas: dict[int, dict] = {}
    for cat_id, cat_nome, status in servicos_periodo.values_list('catalogo_id', 'catalogo__nome', 'status'):
        entry = linhas.setdefault(cat_id, {
            'catalogo_id': cat_id, 'catalogo_nome': cat_nome, 'total': 0, 'canceladas': 0,
        })
        entry['total'] += 1
        if status == StatusServico.CANCELADO:
            entry['canceladas'] += 1

    resultado = [
        {**e, 'percentual': round(e['canceladas'] / e['total'] * 100, 1) if e['total'] else None}
        for e in linhas.values()
    ]
    return sorted(resultado, key=lambda x: x['percentual'] or 0, reverse=True)


def _bloco_cancelamento(queryset, status_cancelado) -> dict:
    total = queryset.count()
    canceladas = queryset.filter(status=status_cancelado).count()
    return {
        'total': total,
        'canceladas': canceladas,
        'percentual': round(canceladas / total * 100, 1) if total else None,
    }
