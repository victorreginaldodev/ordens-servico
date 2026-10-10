from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.catalogo.models import Catalogo
from apps.catalogo.serializers import CatalogoSerializer
from apps.organizacoes.models import Setor
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin


@extend_schema_view(
    list=extend_schema(
        summary='Listar catálogos',
        description=(
            'Retorna a lista de catálogos com seus subitens. O `setor` de cada catálogo é o setor responsável '
            'por executar o serviço. Suporta busca por nome ou descrição e filtros por setor e status.'
        ),
        parameters=[
            OpenApiParameter('q', str, description='Busca por nome ou descrição (parcial).'),
            OpenApiParameter('setor', int, description='Filtrar pelo setor responsável pela execução.'),
            OpenApiParameter(
                'ativo', str, enum=['true', 'false'],
                description='Filtrar por status. Para a criação de OS, use `ativo=true`.',
            ),
        ],
    ),
    create=extend_schema(
        summary='Criar catálogo',
        description=(
            'Cria um novo catálogo. O setor responsável pela execução é obrigatório e precisa estar ativo. '
            'A resposta traz `avisos` quando o setor ainda não tem quem o organize.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar catálogo',
        description='Retorna todos os campos de um catálogo, incluindo seus subitens.',
    ),
    update=extend_schema(
        summary='Atualizar catálogo',
        description='Substitui integralmente os dados de um catálogo.',
    ),
    partial_update=extend_schema(
        summary='Atualizar catálogo parcialmente',
        description='Atualiza um ou mais campos de um catálogo.',
    ),
    destroy=extend_schema(
        summary='Remover catálogo',
        description=(
            'Remove permanentemente um catálogo e todos os seus subitens. '
            'Retorna 409 se o catálogo estiver vinculado a serviços; nesse caso, desative-o (`ativo=false`).'
        ),
    ),
)
class CatalogoViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = Catalogo.objects.select_related('setor').prefetch_related('subitens').all()
    serializer_class = CatalogoSerializer
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.CATALOGO_GERENCIAR,),
        'update': (Permissao.CATALOGO_GERENCIAR,),
        'partial_update': (Permissao.CATALOGO_GERENCIAR,),
        'destroy': (Permissao.CATALOGO_GERENCIAR,),
    }
    dica_exclusao_bloqueada = 'Desative o catálogo em vez de excluí-lo.'

    def create(self, request, *args, **kwargs):
        return self._com_avisos(super().create(request, *args, **kwargs))

    def update(self, request, *args, **kwargs):
        return self._com_avisos(super().update(request, *args, **kwargs))

    def _com_avisos(self, response):
        """Aceita catálogo de setor sem organizador, mas avisa: os serviços cairiam numa fila sem ninguém
        responsável por distribuí-los (ADR 0008, 1)."""
        setor = Setor.objects.filter(pk=response.data.get('setor')).first()
        response.data['avisos'] = []
        if setor is not None and not setor.organizadores():
            response.data['avisos'].append(
                f'O setor "{setor}" ainda não tem quem organize o trabalho (ninguém com permissão de ver e '
                'distribuir os serviços do setor). Os serviços deste catálogo vão chegar a uma fila sem responsável.'
            )
        return response

    def get_queryset(self):
        queryset = super().get_queryset()
        q = self.request.query_params.get('q', '').strip()
        setor_id = self.request.query_params.get('setor', '').strip()
        ativo = self.request.query_params.get('ativo', '').strip().lower()
        if q:
            queryset = queryset.filter(Q(nome__icontains=q) | Q(descricao__icontains=q))
        if setor_id:
            queryset = queryset.filter(setor_id=setor_id)
        if ativo in ('true', 'false'):
            queryset = queryset.filter(ativo=(ativo == 'true'))
        return queryset
