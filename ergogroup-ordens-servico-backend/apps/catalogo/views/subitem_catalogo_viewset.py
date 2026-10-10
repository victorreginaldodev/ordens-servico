from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.catalogo.models import SubitemCatalogo
from apps.catalogo.serializers import SubitemCatalogoSerializer
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin


@extend_schema_view(
    list=extend_schema(
        summary='Listar subitens de catálogo',
        description='Retorna a lista de subitens de catálogo. Suporta filtragem por catálogo, status e busca textual.',
        parameters=[
            OpenApiParameter('catalogo', int, description='Filtrar pelo ID do catálogo.'),
            OpenApiParameter('ativo', str, description='Filtrar por status de ativação.', enum=['true', 'false']),
            OpenApiParameter('q', str, description='Busca por nome ou descrição (parcial).'),
        ],
    ),
    create=extend_schema(
        summary='Criar subitem de catálogo',
        description='Cria um novo subitem vinculado a um catálogo. O par (catálogo, nome) deve ser único.',
    ),
    retrieve=extend_schema(
        summary='Detalhar subitem de catálogo',
        description='Retorna todos os campos de um subitem de catálogo pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar subitem de catálogo',
        description='Substitui integralmente os dados de um subitem de catálogo.',
    ),
    partial_update=extend_schema(
        summary='Atualizar subitem de catálogo parcialmente',
        description='Atualiza um ou mais campos de um subitem de catálogo.',
    ),
    destroy=extend_schema(
        summary='Remover subitem de catálogo',
        description='Remove permanentemente um subitem de catálogo.',
    ),
)
class SubitemCatalogoViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = SubitemCatalogo.objects.select_related('catalogo').all()
    serializer_class = SubitemCatalogoSerializer
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.CATALOGO_GERENCIAR,),
        'update': (Permissao.CATALOGO_GERENCIAR,),
        'partial_update': (Permissao.CATALOGO_GERENCIAR,),
        'destroy': (Permissao.CATALOGO_GERENCIAR,),
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        catalogo = self.request.query_params.get('catalogo')
        ativo = self.request.query_params.get('ativo')
        q = self.request.query_params.get('q', '').strip()

        if catalogo:
            queryset = queryset.filter(catalogo_id=catalogo)

        if ativo is not None:
            ativo_normalizado = ativo.strip().lower()
            if ativo_normalizado in ['true', '1', 'sim']:
                queryset = queryset.filter(ativo=True)
            elif ativo_normalizado in ['false', '0', 'nao']:
                queryset = queryset.filter(ativo=False)

        if q:
            queryset = queryset.filter(Q(nome__icontains=q) | Q(descricao__icontains=q))

        return queryset
