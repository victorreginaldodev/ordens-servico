from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.organizacoes.permissoes import Permissao, TemPermissao
from apps.organizacoes.models import Organizacao
from apps.organizacoes.serializers import OrganizacaoSerializer


@extend_schema_view(
    list=extend_schema(
        summary='Listar organizações',
        description='Retorna os dados cadastrais das organizações (base da tela de configurações).',
    ),
    create=extend_schema(
        summary='Criar organização',
        description='Cria uma organização. Requer perfil Gestor ou superior.',
    ),
    retrieve=extend_schema(
        summary='Detalhar organização',
        description='Retorna todos os dados cadastrais de uma organização pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar organização',
        description='Substitui integralmente os dados de uma organização. Requer perfil Gestor ou superior.',
    ),
    partial_update=extend_schema(
        summary='Atualizar organização parcialmente',
        description='Atualiza um ou mais campos de uma organização. Requer perfil Gestor ou superior.',
    ),
)
class OrganizacaoViewSet(viewsets.ModelViewSet):
    queryset = Organizacao.objects.all()
    serializer_class = OrganizacaoSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update'):
            return [IsAuthenticated(), TemPermissao(Permissao.ORGANIZACAO_CONFIGURAR)]
        return [IsAuthenticated()]
