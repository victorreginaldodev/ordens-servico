from datetime import date

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.analise.serializers import FinanceiroAnaliseResponseSerializer
from apps.analise.services.financeiro import (
    calcular_clientes,
    calcular_faturamento,
    calcular_kpis,
    calcular_ticket_medio,
    calcular_vendas_por_mes,
)
from apps.analise.utils import gerar_intervalo_meses
from apps.organizacoes.permissoes import Permissao, TemPermissao


class FinanceiroAnaliseView(APIView):

    def get_permissions(self):
        return [IsAuthenticated(), TemPermissao(Permissao.FINANCEIRO_VER_VALORES)]

    @extend_schema(
        summary='Análise financeira',
        description=(
            'KPIs de cobrança, ticket médio, vendas mensais e ranking de clientes; a faturar, faturado e '
            'previsão por tipo de condição e a receita recorrente mensal. Exige a permissão '
            '`financeiro.ver_valores` (403 sem ela).'
        ),
        responses={
            200: FinanceiroAnaliseResponseSerializer,
            403: OpenApiResponse(description='Sem permissão para ver valores financeiros.'),
        },
    )
    def get(self, request):
        hoje = timezone.now().date()
        meses = gerar_intervalo_meses(hoje, 12)
        data_inicio = date(meses[0]['ano'], meses[0]['mes'], 1)

        return Response({
            **calcular_kpis(),
            **calcular_faturamento(),
            'ticket_medio': calcular_ticket_medio(),
            'vendas_por_mes': calcular_vendas_por_mes(data_inicio, meses),
            'clientes': calcular_clientes(),
        })
