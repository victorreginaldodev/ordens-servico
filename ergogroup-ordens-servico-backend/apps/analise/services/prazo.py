from django.db.models import F

from apps.ordens_servico.models import OrdemServicoOperacional, Tarefa
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional
from apps.ordens_servico.models.tarefa import StatusTarefa


def calcular_taxa_cumprimento_prazo_global() -> dict:
    """Taxa de cumprimento de prazo histórico (sem janela de 12 meses).

    Diferente de tarefas_atrasadas/mini_os_atrasadas (que contam itens ainda
    abertos e já vencidos): aqui a pergunta é, entre o que já foi concluído e
    tinha prazo definido, quanto foi entregue dentro do prazo.
    """
    tarefas_concluidas_com_prazo = Tarefa.objects.filter(
        status=StatusTarefa.CONCLUIDA, prazo__isnull=False, data_termino__isnull=False,
    )
    minios_concluidas_com_prazo = OrdemServicoOperacional.objects.filter(
        status=StatusOrdemServicoOperacional.FINALIZADA, prazo__isnull=False, data_termino__isnull=False,
    )
    return {
        'tarefas': _bloco(tarefas_concluidas_com_prazo),
        'minios': _bloco(minios_concluidas_com_prazo),
    }


def _bloco(queryset) -> dict:
    total = queryset.count()
    no_prazo = queryset.filter(data_termino__lte=F('prazo')).count()
    return {
        'total_com_prazo': total,
        'no_prazo': no_prazo,
        'percentual': round(no_prazo / total * 100, 1) if total else None,
    }
