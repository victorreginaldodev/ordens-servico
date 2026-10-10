"""Endpoints do financeiro (fase 10). A lógica está em `services/financeiro.py`. Faturar é o endpoint que já
existe: `PATCH /api/ordens-servico/ordens/{id}/cobranca/`."""
from datetime import date

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ordens_servico.models import FormaPagamento, OrdemServico, TipoCondicao
from apps.ordens_servico.serializers.financeiro_serializer import CobrancasSerializer, SituacaoFinanceiraSerializer
from apps.ordens_servico.services import financeiro
from apps.organizacoes.permissoes import Permissao, TemPermissao


def _data(request, parametro):
    valor = request.query_params.get(parametro, '').strip()
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({parametro: 'Use o formato AAAA-MM-DD.'})


class CobrancasView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), TemPermissao(Permissao.FINANCEIRO_REGISTRAR_COBRANCA)]

    @extend_schema(
        summary='Cobranças',
        description=(
            'As OS de uma situação, com tudo o que o financeiro precisa para faturar: `a_faturar` (liberadas e '
            'ainda não lançadas, as mais antigas primeiro), `faturadas` (lançadas, as mais recentes primeiro) e '
            '`previsao` (ainda não liberadas, as mais perto de liberar primeiro; sem as canceladas). Traz os '
            'contadores das três situações sob os mesmos filtros. Exige `financeiro.registrar_cobranca`.'
        ),
        parameters=[
            OpenApiParameter('situacao', str, enum=financeiro.SITUACOES, description='Padrão: `a_faturar`.'),
            OpenApiParameter('cliente', int, description='Filtrar pelo cliente.'),
            OpenApiParameter('de', str, description='Vendas a partir desta data (AAAA-MM-DD).'),
            OpenApiParameter('ate', str, description='Vendas até esta data (AAAA-MM-DD).'),
            OpenApiParameter('tipo_condicao', str, enum=TipoCondicao.values),
            OpenApiParameter('forma_pagamento', str, enum=FormaPagamento.values),
            OpenApiParameter('em_alerta', str, enum=['true'], description='Só as liberadas há N dias sem lançamento.'),
        ],
        responses={200: CobrancasSerializer},
        tags=['financeiro'],
    )
    def get(self, request):
        situacao = request.query_params.get('situacao', '').strip() or financeiro.Situacao.A_FATURAR
        if situacao not in financeiro.SITUACOES:
            raise ValidationError({'situacao': f'Use uma de: {", ".join(financeiro.SITUACOES)}.'})
        filtros = {
            'cliente': request.query_params.get('cliente', '').strip(),
            'de': _data(request, 'de'),
            'ate': _data(request, 'ate'),
            'tipo_condicao': request.query_params.get('tipo_condicao', '').strip(),
            'forma_pagamento': request.query_params.get('forma_pagamento', '').strip(),
            'em_alerta': request.query_params.get('em_alerta', '').strip() == 'true',
        }
        return Response(CobrancasSerializer(financeiro.cobrancas(situacao, filtros)).data)


class SituacaoFinanceiraView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), TemPermissao(Permissao.FINANCEIRO_VER_VALORES)]

    @extend_schema(
        summary='Situação financeira da OS',
        description=(
            'Condição, liberação, lançamento e alerta da OS, os serviços com a etapa de cada um e os eventos '
            'financeiros (venda, liberação e lançamento). Exige `financeiro.ver_valores`.'
        ),
        responses={200: SituacaoFinanceiraSerializer},
        tags=['financeiro'],
    )
    def get(self, request, pk):
        ordem = get_object_or_404(OrdemServico, pk=pk)
        return Response(SituacaoFinanceiraSerializer(financeiro.situacao_financeira(ordem)).data)
