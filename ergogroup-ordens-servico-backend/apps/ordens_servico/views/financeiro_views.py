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
from apps.ordens_servico.serializers.financeiro_serializer import (
    CobrancasSerializer, ConferenciaSerializer, CorrecaoSerializer, SituacaoFinanceiraSerializer,
)
from apps.ordens_servico.services import conferencia, financeiro
from apps.organizacoes.permissoes import Permissao, TemPermissao


def _data(request, parametro):
    valor = request.query_params.get(parametro, '').strip()
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({parametro: 'Use o formato AAAA-MM-DD.'})


class _DoFinanceiro(APIView):
    def get_permissions(self):
        # Mostra valores: exige também `financeiro.ver_valores` (revisão de permissões, P7).
        return [
            IsAuthenticated(), TemPermissao(Permissao.FINANCEIRO_REGISTRAR_COBRANCA),
            TemPermissao(Permissao.FINANCEIRO_VER_VALORES),
        ]


class CobrancasView(_DoFinanceiro):

    @extend_schema(
        summary='Cobranças',
        description=(
            'As OS de uma situação, com tudo o que o financeiro precisa para faturar: `a_faturar` (liberadas e '
            'ainda não lançadas, as mais antigas primeiro), `faturadas` (lançadas, as mais recentes primeiro) e '
            '`previsao` (ainda não liberadas, as mais perto de liberar primeiro; sem as canceladas). Com `todas`, '
            'as três numa chamada (a faturar, previsão e faturadas, nessa ordem). Traz os contadores das três '
            'situações sob os mesmos filtros, o que falta em cada OS da previsão (`pendentes`) e os códigos da '
            'conferência (`pendencias`). Exige `financeiro.registrar_cobranca` e `financeiro.ver_valores`.'
        ),
        parameters=[
            OpenApiParameter('situacao', str, enum=financeiro.SITUACOES + [financeiro.Situacao.TODAS],
                             description='Padrão: `a_faturar`.'),
            OpenApiParameter('cliente', int, description='Filtrar pelo cliente.'),
            OpenApiParameter('de', str, description='Vendas a partir desta data (AAAA-MM-DD).'),
            OpenApiParameter('ate', str, description='Vendas até esta data (AAAA-MM-DD).'),
            OpenApiParameter('tipo_condicao', str, enum=TipoCondicao.values),
            OpenApiParameter('forma_pagamento', str, enum=FormaPagamento.values),
            OpenApiParameter('em_alerta', str, enum=['true'], description='Só as liberadas há N dias sem lançamento.'),
            OpenApiParameter('faturada_de', str, description='Faturadas lançadas a partir desta data (AAAA-MM-DD).'),
            OpenApiParameter('faturada_ate', str, description='Faturadas lançadas até esta data (AAAA-MM-DD).'),
        ],
        responses={200: CobrancasSerializer},
        tags=['financeiro'],
    )
    def get(self, request):
        situacao = request.query_params.get('situacao', '').strip() or financeiro.Situacao.A_FATURAR
        validas = financeiro.SITUACOES + [financeiro.Situacao.TODAS]
        if situacao not in validas:
            raise ValidationError({'situacao': f'Use uma de: {", ".join(validas)}.'})
        filtros = {
            'cliente': request.query_params.get('cliente', '').strip(),
            'de': _data(request, 'de'),
            'ate': _data(request, 'ate'),
            'tipo_condicao': request.query_params.get('tipo_condicao', '').strip(),
            'forma_pagamento': request.query_params.get('forma_pagamento', '').strip(),
            'em_alerta': request.query_params.get('em_alerta', '').strip() == 'true',
            'faturada_de': _data(request, 'faturada_de'),
            'faturada_ate': _data(request, 'faturada_ate'),
        }
        return Response(CobrancasSerializer(financeiro.cobrancas(situacao, filtros)).data)


class SituacaoFinanceiraView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), TemPermissao(Permissao.FINANCEIRO_VER_VALORES)]

    @extend_schema(
        summary='Situação financeira da OS',
        description=(
            'O resumo para faturar: os dados do cliente; condição, liberação, lançamento e alerta da OS; os serviços realizados (setor, '
            'quem executou, início, término e quem finalizou); as pendências da conferência; e a linha do tempo da '
            'OS, com a categoria de cada evento (`financeiro` ou `execucao`). Exige `financeiro.ver_valores`.'
        ),
        responses={200: SituacaoFinanceiraSerializer},
        tags=['financeiro'],
    )
    def get(self, request, pk):
        ordem = get_object_or_404(OrdemServico, pk=pk)
        return Response(SituacaoFinanceiraSerializer(financeiro.situacao_financeira(ordem, request.user)).data)


class ConferenciaView(_DoFinanceiro):
    @extend_schema(
        summary='Conferência do faturamento',
        description=(
            'O que o sistema verifica para que nada concluído fique sem cobrança (faturamento/04). As garantias '
            '(`tipo=garantia`) são as regras da liberação e devem dar sempre 0; as atenções dizem o que depende de '
            'alguém ou o que mudou depois da liberação ou do lançamento, com o serviço, o setor e quem está com ele. '
            'Calculada na hora da consulta. Exige `financeiro.registrar_cobranca` e `financeiro.ver_valores`.'
        ),
        responses={200: ConferenciaSerializer},
        tags=['financeiro'],
    )
    def get(self, request):
        return Response(ConferenciaSerializer(conferencia.conferencia()).data)


class CorrigirConferenciaView(_DoFinanceiro):
    @extend_schema(
        summary='Corrigir a sincronização',
        description=(
            'Refaz a sincronização dos serviços e das OS ainda não liberadas (o mesmo que acontece quando uma '
            'tarefa é salva). Só aplica o que a regra manda; cada mudança fica na auditoria. Devolve quantos '
            'serviços mudaram de status e quantas OS foram liberadas.'
        ),
        request=None,
        responses={200: CorrecaoSerializer},
        tags=['financeiro'],
    )
    def post(self, request):
        return Response(CorrecaoSerializer(conferencia.corrigir()).data)
