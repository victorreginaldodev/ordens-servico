from django.db.models import Count

from apps.analise.utils import agregar_por_mes, preencher_meses
from apps.ordens_servico.models import Tarefa
from apps.ordens_servico.models.tarefa import StatusTarefa


def calcular_tarefas(data_inicio, meses) -> dict:
    concluidas = Tarefa.objects.filter(
        status=StatusTarefa.CONCLUIDA,
        data_termino__isnull=False,
        data_termino__gte=data_inicio,
    )
    por_mes_map = agregar_por_mes(concluidas, campo_data='data_termino')
    por_status = [
        {
            'status': item['status'],
            'status_display': dict(StatusTarefa.choices).get(item['status'], item['status']),
            'total': item['total'],
        }
        for item in Tarefa.objects.values('status').annotate(total=Count('id'))
    ]
    return {
        'por_status': por_status,
        'concluidas_por_mes': preencher_meses(meses, por_mes_map),
    }
