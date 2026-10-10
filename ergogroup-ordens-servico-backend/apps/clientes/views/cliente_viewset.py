from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.clientes.models import Cliente
from apps.clientes.models.cliente import TipoCliente
from apps.clientes.serializers import ClienteListSerializer, ClienteSerializer
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin


@extend_schema_view(
    list=extend_schema(
        summary='Listar clientes',
        description=(
            'Retorna a lista paginada de clientes com campos resumidos. '
            'Suporta busca textual e filtragem por tipo e status.'
        ),
        parameters=[
            OpenApiParameter(
                'q', str,
                description='Busca por nome ou número de inscrição (parcial, sem distinção de maiúsculas).',
            ),
            OpenApiParameter(
                'tipo', str,
                description='Filtrar por tipo de cliente.',
                enum=TipoCliente,
            ),
            OpenApiParameter(
                'ativo', str,
                description='Filtrar por status de ativação.',
                enum=['true', 'false'],
            ),
        ],
    ),
    create=extend_schema(
        summary='Cadastrar cliente',
        description='Cria um novo cliente com todos os dados cadastrais.',
    ),
    retrieve=extend_schema(
        summary='Detalhar cliente',
        description='Retorna todos os campos cadastrais de um cliente pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar cliente',
        description='Substitui integralmente os dados cadastrais de um cliente.',
    ),
    partial_update=extend_schema(
        summary='Atualizar cliente parcialmente',
        description='Atualiza um ou mais campos cadastrais de um cliente.',
    ),
    destroy=extend_schema(
        summary='Remover cliente',
        description='Remove permanentemente um cliente.',
    ),
)
class ClienteViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.CLIENTES_GERENCIAR,),
        'update': (Permissao.CLIENTES_GERENCIAR,),
        'partial_update': (Permissao.CLIENTES_GERENCIAR,),
        'destroy': (Permissao.CLIENTES_GERENCIAR,),
    }

    def get_serializer_class(self):
        if self.action == 'list':
            return ClienteListSerializer
        return ClienteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        q = self.request.query_params.get('q', '').strip()
        tipo = self.request.query_params.get('tipo', '').strip()
        ativo = self.request.query_params.get('ativo', '').strip()

        if q:
            queryset = queryset.filter(
                Q(nome__icontains=q) | Q(numero_inscricao__icontains=q)
            )
        if tipo:
            queryset = queryset.filter(tipo_cliente=tipo)
        if ativo in ('true', 'false'):
            queryset = queryset.filter(ativo=(ativo == 'true'))

        return queryset
