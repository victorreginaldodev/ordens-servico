from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.catalogo.models import Catalogo
from apps.catalogo.serializers import CatalogoSerializer
from apps.catalogo.serializers.catalogo_serializer import (
    MudarSetorDosCatalogosSerializer,
    ResultadoMudarSetorSerializer,
)
from apps.catalogo.services import com_servicos_em_aberto, mudar_setor_dos_catalogos
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
            'Cria um novo catálogo. O setor responsável pela execução é obrigatório, precisa estar ativo e, '
            'para catálogo ativo, ter quem receba tarefas (400 se não tiver). '
            'A resposta traz `avisos` quando o setor ainda não tem quem o organize.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar catálogo',
        description='Retorna todos os campos de um catálogo, incluindo seus subitens.',
    ),
    update=extend_schema(
        summary='Atualizar catálogo',
        description=(
            'Substitui integralmente os dados de um catálogo. Ao mudar o setor, `mover_servicos_em_aberto=true` '
            'leva junto os serviços em aberto e sem tarefas (`servicos_em_aberto`); a resposta traz '
            '`servicos_movidos`. Catálogo ativo só em setor com quem receba tarefas.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar catálogo parcialmente',
        description='Atualiza um ou mais campos de um catálogo. Mesmas regras de setor da atualização completa.',
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
        'mudar_setor': (Permissao.CATALOGO_GERENCIAR,),
        'create': (Permissao.CATALOGO_GERENCIAR,),
        'update': (Permissao.CATALOGO_GERENCIAR,),
        'partial_update': (Permissao.CATALOGO_GERENCIAR,),
        'destroy': (Permissao.CATALOGO_GERENCIAR,),
    }
    dica_exclusao_bloqueada = 'Desative o catálogo em vez de excluí-lo.'

    def create(self, request, *args, **kwargs):
        return self._com_avisos(super().create(request, *args, **kwargs))

    @extend_schema(
        summary='Mudar o setor de vários catálogos',
        description=(
            'Passa os catálogos informados para o setor escolhido (ativo e, se algum catálogo for ativo, com quem '
            'receba tarefas). Com `mover_servicos_em_aberto=true`, leva junto os serviços em aberto e sem tarefas; '
            'eles voltam a "novo" no setor de destino, que recebe o aviso de chegada. Exige `catalogo.gerenciar`.'
        ),
        request=MudarSetorDosCatalogosSerializer,
        responses={200: ResultadoMudarSetorSerializer},
    )
    @action(detail=False, methods=['post'], url_path='mudar-setor')
    def mudar_setor(self, request):
        entrada = MudarSetorDosCatalogosSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        setor = entrada.validated_data['setor']
        alterados, movidos = mudar_setor_dos_catalogos(
            entrada.validated_data['catalogos'], setor, entrada.validated_data['mover_servicos_em_aberto'],
        )
        return Response({
            'catalogos_alterados': alterados, 'servicos_movidos': movidos, 'avisos': self._avisos_do_setor(setor),
        })

    def _avisos_do_setor(self, setor):
        if setor is None or setor.organizadores():
            return []
        return [
            f'O setor "{setor}" ainda não tem quem organize o trabalho (ninguém com permissão de ver e '
            'distribuir os serviços do setor). Os serviços deste catálogo vão chegar a uma fila sem responsável.'
        ]

    def _com_avisos(self, response):
        """Aceita catálogo de setor sem organizador, mas avisa: os serviços cairiam numa fila sem ninguém
        responsável por distribuí-los (ADR 0008, 1)."""
        setor = Setor.objects.filter(pk=response.data.get('setor')).first()
        response.data['avisos'] = self._avisos_do_setor(setor)
        return response

    def perform_update(self, serializer):
        serializer.save()
        self._servicos_movidos = getattr(serializer, 'servicos_movidos', 0)

    def update(self, request, *args, **kwargs):
        response = self._com_avisos(super().update(request, *args, **kwargs))
        response.data['servicos_movidos'] = getattr(self, '_servicos_movidos', 0)
        return response

    def get_queryset(self):
        queryset = com_servicos_em_aberto(super().get_queryset())
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
