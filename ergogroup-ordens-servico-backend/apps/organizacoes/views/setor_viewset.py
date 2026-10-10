from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.organizacoes.permissoes import Permissao, TemPermissao
from apps.organizacoes.models import Setor
from apps.organizacoes.serializers import SetorSerializer


@extend_schema_view(
    list=extend_schema(
        summary='Listar setores',
        description='Retorna os setores da empresa. Suporta busca por nome ou descrição e filtro por status.',
        parameters=[
            OpenApiParameter('q', str, description='Busca por nome ou descrição (parcial).'),
            OpenApiParameter('ativo', str, description='Filtrar por status de ativação.', enum=['true', 'false']),
        ],
    ),
    create=extend_schema(
        summary='Criar setor',
        description='Cria um novo setor. O nome deve ser único. Requer perfil Gestor ou superior.',
    ),
    retrieve=extend_schema(
        summary='Detalhar setor',
        description='Retorna todos os campos de um setor pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar setor',
        description='Substitui integralmente os dados de um setor. Requer perfil Gestor ou superior.',
    ),
    partial_update=extend_schema(
        summary='Atualizar setor parcialmente',
        description='Atualiza um ou mais campos de um setor. Requer perfil Gestor ou superior.',
    ),
    destroy=extend_schema(
        summary='Remover setor',
        description=(
            'Remove permanentemente um setor. Requer perfil Gestor ou superior. '
            'Retorna 409 se o setor estiver vinculado a catálogos ou serviços; nesse caso, desative-o.'
        ),
    ),
)
class SetorViewSet(viewsets.ModelViewSet):
    queryset = Setor.objects.all()
    serializer_class = SetorSerializer
    dica_exclusao_bloqueada = 'Desative o setor em vez de excluí-lo.'

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), TemPermissao(Permissao.ORGANIZACAO_CONFIGURAR)]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        ativo = self.request.query_params.get('ativo', '').strip().lower()
        q = self.request.query_params.get('q', '').strip()

        if ativo in ('true', 'false'):
            queryset = queryset.filter(ativo=(ativo == 'true'))
        if q:
            queryset = queryset.filter(Q(nome__icontains=q) | Q(descricao__icontains=q))

        return queryset
