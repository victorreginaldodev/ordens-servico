from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.organizacoes.models import Funcao
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin, escopo_da_permissao, pode_conceder
from apps.organizacoes.serializers import FuncaoSerializer, PermissaoCatalogoSerializer


@extend_schema_view(
    list=extend_schema(
        summary='Listar funções',
        description='Retorna as funções da organização com as permissões que cada uma concede.',
        parameters=[
            OpenApiParameter('organizacao', int, description='Filtrar pela organização.'),
            OpenApiParameter('setor', int, description='Só as funções liberadas neste setor.'),
            OpenApiParameter('ativo', str, description='Filtrar por status de ativação.', enum=['true', 'false']),
            OpenApiParameter('q', str, description='Busca por nome ou descrição (parcial).'),
        ],
    ),
    create=extend_schema(
        summary='Criar função',
        description=(
            'Cria uma função com nome livre, as permissões marcadas e os setores em que pode ser usada '
            '(`setores`, obrigatório). Exige `organizacao.configurar`.'
        ),
    ),
    retrieve=extend_schema(summary='Detalhar função'),
    update=extend_schema(
        summary='Atualizar função',
        description='Substitui os dados e as permissões da função. Exige `organizacao.configurar`.',
    ),
    partial_update=extend_schema(
        summary='Atualizar função parcialmente',
        description='Se `permissoes` for enviado, substitui a lista inteira. Exige `organizacao.configurar`.',
    ),
    destroy=extend_schema(
        summary='Remover função',
        description='Remove a função. Retorna 409 se houver usuários vinculados a ela; nesse caso, desative-a.',
    ),
)
class FuncaoViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = Funcao.objects.prefetch_related('permissoes', 'setores').all()
    serializer_class = FuncaoSerializer
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.ORGANIZACAO_CONFIGURAR,),
        'update': (Permissao.ORGANIZACAO_CONFIGURAR,),
        'partial_update': (Permissao.ORGANIZACAO_CONFIGURAR,),
        'destroy': (Permissao.ORGANIZACAO_CONFIGURAR,),
    }
    dica_exclusao_bloqueada = 'Desative a função em vez de excluí-la.'

    def perform_destroy(self, instance):
        if not pode_conceder(self.request.user, instance.codigos_permissao):
            raise PermissionDenied('Você não pode excluir uma função que concede permissões que você não tem.')
        instance.delete()

    def get_queryset(self):
        queryset = super().get_queryset()
        organizacao = self.request.query_params.get('organizacao', '').strip()
        setor = self.request.query_params.get('setor', '').strip()
        ativo = self.request.query_params.get('ativo', '').strip().lower()
        q = self.request.query_params.get('q', '').strip()

        if organizacao:
            queryset = queryset.filter(organizacao_id=organizacao)
        if setor:
            queryset = queryset.filter(setores=setor)
        if ativo in ('true', 'false'):
            queryset = queryset.filter(ativo=(ativo == 'true'))
        if q:
            queryset = queryset.filter(Q(nome__icontains=q) | Q(descricao__icontains=q))
        return queryset

    @extend_schema(
        summary='Catálogo de permissões',
        description=(
            'Lista todas as permissões que podem ser marcadas numa função. `escopo=setor` indica que a '
            'permissão vale só nos setores do vínculo; `global`, na organização toda.'
        ),
        responses={200: PermissaoCatalogoSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='permissoes-disponiveis')
    def permissoes_disponiveis(self, request):
        return Response([
            {'codigo': p.value, 'descricao': p.label, 'escopo': escopo_da_permissao(p)}
            for p in Permissao
        ])
