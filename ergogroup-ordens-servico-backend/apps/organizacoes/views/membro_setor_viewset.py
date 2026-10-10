from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.organizacoes.models import MembroSetor
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin, pode_conceder
from apps.organizacoes.serializers import MembroSetorSerializer


@extend_schema_view(
    list=extend_schema(
        summary='Listar vínculos de usuários com setores',
        description='Cada vínculo diz em qual setor o usuário atua e com qual função.',
        parameters=[
            OpenApiParameter('usuario', int, description='Filtrar pelo usuário.'),
            OpenApiParameter('setor', int, description='Filtrar pelo setor.'),
            OpenApiParameter('funcao', int, description='Filtrar pela função.'),
        ],
    ),
    create=extend_schema(
        summary='Vincular usuário a setor',
        description=(
            'Vincula o usuário a um setor com uma função da mesma organização. Cada usuário pertence a um '
            'único setor: para mudar de setor, edite o vínculo existente. Exige `usuarios.gerenciar`.'
        ),
    ),
    retrieve=extend_schema(summary='Detalhar vínculo'),
    update=extend_schema(summary='Atualizar vínculo', description='Exige `usuarios.gerenciar`.'),
    partial_update=extend_schema(summary='Atualizar vínculo parcialmente', description='Exige `usuarios.gerenciar`.'),
    destroy=extend_schema(summary='Remover vínculo', description='Exige `usuarios.gerenciar`.'),
)
class MembroSetorViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = MembroSetor.objects.select_related('usuario', 'setor', 'funcao').all()
    serializer_class = MembroSetorSerializer
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.USUARIOS_GERENCIAR,),
        'update': (Permissao.USUARIOS_GERENCIAR,),
        'partial_update': (Permissao.USUARIOS_GERENCIAR,),
        'destroy': (Permissao.USUARIOS_GERENCIAR,),
    }

    def perform_destroy(self, instance):
        if not pode_conceder(self.request.user, instance.funcao.codigos_permissao, instance.setor):
            raise PermissionDenied('Você não pode remover um vínculo com permissões que você não tem.')
        instance.delete()

    def get_queryset(self):
        queryset = super().get_queryset()
        for parametro in ('usuario', 'setor', 'funcao'):
            valor = self.request.query_params.get(parametro, '').strip()
            if valor:
                queryset = queryset.filter(**{f'{parametro}_id': valor})
        return queryset
