from datetime import date

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.analise.serializers import OperacionalAnaliseResponseSerializer
from apps.analise.services.cancelamento import calcular_cancelamento_por_catalogo, calcular_taxa_cancelamento
from apps.analise.services.ordens_servico import calcular_ordens_servico
from apps.analise.services.ordens_servico_operacionais import (
    calcular_ordens_servico_operacionais,
    calcular_tempo_por_catalogo_operacional,
)
from apps.analise.services.prazo import calcular_taxa_cumprimento_prazo_global
from apps.analise.services.produtividade import calcular_por_tecnico
from apps.analise.services.servicos import calcular_servicos
from apps.analise.services.tarefas import calcular_tarefas
from apps.analise.services.tempos import calcular_tempos_medios
from apps.analise.utils import gerar_intervalo_meses


class OperacionalAnaliseView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Análise operacional',
        description=(
            'Métricas agregadas de ordens de serviço, serviços, tarefas, OS '
            'operacionais, tempos médios, cancelamento, cumprimento de prazo '
            'e produtividade por técnico. Não contém valores monetários nem '
            'dados de clientes ranqueados por valor — disponível para '
            'qualquer perfil autenticado. Técnicos veem apenas a própria '
            'linha em `por_tecnico`.'
        ),
        responses={200: OperacionalAnaliseResponseSerializer},
    )
    def get(self, request):
        hoje = timezone.now().date()
        meses = gerar_intervalo_meses(hoje, 12)
        data_inicio = date(meses[0]['ano'], meses[0]['mes'], 1)

        tempos_medios = calcular_tempos_medios(data_inicio)
        tempos_medios['tempo_por_catalogo_oso'] = calcular_tempo_por_catalogo_operacional()

        return Response({
            'ordens_servico': calcular_ordens_servico(data_inicio, meses, hoje),
            'servicos': calcular_servicos(data_inicio, meses),
            'tarefas': calcular_tarefas(data_inicio, meses),
            'minios': calcular_ordens_servico_operacionais(data_inicio, meses, hoje),
            'tempos_medios': tempos_medios,
            'taxa_cancelamento': {
                **calcular_taxa_cancelamento(data_inicio),
                'por_catalogo': calcular_cancelamento_por_catalogo(data_inicio),
            },
            'taxa_cumprimento_prazo': calcular_taxa_cumprimento_prazo_global(),
            'por_tecnico': calcular_por_tecnico(data_inicio, meses, request.user),
        })
