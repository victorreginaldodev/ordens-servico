from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.catalogo.models import CatalogoOperacional
from apps.catalogo.serializers import CatalogoOperacionalSerializer
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin, TemPermissao


@extend_schema_view(
    list=extend_schema(
        summary='Listar catálogos operacionais',
        description='Retorna o catálogo de serviços disponíveis para Ordens de Serviço Operacionais. Suporta busca por nome ou descrição.',
        parameters=[OpenApiParameter('q', str, description='Busca por nome ou descrição (parcial).')],
    ),
    create=extend_schema(
        summary='Criar catálogo operacional',
        description='Cria um novo serviço no catálogo operacional.',
    ),
    retrieve=extend_schema(
        summary='Detalhar catálogo operacional',
        description='Retorna todos os campos de um catálogo operacional pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar catálogo operacional',
        description=(
            'Substitui integralmente os dados de um catálogo operacional. Se a regra de cobrança mudar, ela é '
            'aplicada às OS operacionais deste serviço ainda não faturadas.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar catálogo operacional parcialmente',
        description=(
            'Atualiza um ou mais campos de um catálogo operacional. Se `gera_cobranca` ou '
            '`clientes_isentos_cobranca` forem enviados, a regra é aplicada às OS operacionais deste serviço ainda '
            'não faturadas: as finalizadas que passam a cobrar são liberadas para o financeiro.'
        ),
    ),
    destroy=extend_schema(
        summary='Remover catálogo operacional',
        description='Remove permanentemente um catálogo operacional.',
    ),
)
class CatalogoOperacionalViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = CatalogoOperacional.objects.all()
    serializer_class = CatalogoOperacionalSerializer
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.CATALOGO_OPERACIONAL_GERENCIAR,),
        'update': (Permissao.CATALOGO_OPERACIONAL_GERENCIAR,),
        'partial_update': (Permissao.CATALOGO_OPERACIONAL_GERENCIAR,),
        'destroy': (Permissao.CATALOGO_OPERACIONAL_GERENCIAR,),
    }
    campos_de_cobranca = frozenset({'gera_cobranca', 'clientes_isentos_cobranca'})

    def get_permissions(self):
        permissoes = super().get_permissions()
        if self.action in {'create', 'update', 'partial_update'} and (
            self.campos_de_cobranca.intersection(self.request.data)
        ):
            permissoes.append(TemPermissao(Permissao.CATALOGO_OPERACIONAL_CONFIGURAR_COBRANCA))
        return permissoes

    def perform_update(self, serializer):
        catalogo = serializer.save()
        # Mudou a regra de cobrança: vale também para as OS operacionais ainda não faturadas (ADR 0011).
        if self.campos_de_cobranca.intersection(self.request.data):
            catalogo.reaplicar_regra_de_cobranca()

    def get_queryset(self):
        queryset = super().get_queryset()
        q = self.request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(Q(nome__icontains=q) | Q(descricao__icontains=q))
        return queryset
