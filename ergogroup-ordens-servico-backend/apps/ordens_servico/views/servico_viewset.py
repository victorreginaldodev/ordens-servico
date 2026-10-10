from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.ordens_servico.models import Servico, Prioridade
from apps.ordens_servico.serializers.linha_do_tempo_serializer import EventoDaLinhaDoTempoSerializer
from apps.ordens_servico.services import linha_do_tempo
from apps.ordens_servico.services.visibilidade import servicos_visiveis
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin, tem_permissao
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.serializers import ServicoListSerializer, ServicoSerializer


class PodeGerenciarServico(BasePermission):
    """Alterar um serviço exige `os.gerenciar` ou `servicos.gerenciar` no setor do serviço."""
    message = 'Seu perfil não pode alterar serviços deste setor.'
    ACOES = ('update', 'partial_update', 'destroy', 'sincronizar')

    def has_object_permission(self, request, view, obj):
        if view.action not in self.ACOES:
            return True
        return tem_permissao(request.user, Permissao.OS_GERENCIAR) or tem_permissao(
            request.user, Permissao.SERVICOS_GERENCIAR, obj.setor_id,
        )


@extend_schema_view(
    list=extend_schema(
        summary='Listar serviços',
        description=(
            'Retorna a lista paginada de serviços com campos resumidos. '
            'Suporta filtragem por OS, status, catálogo e setor.'
        ),
        parameters=[
            OpenApiParameter('ordem_servico', int, description='Filtrar pelo ID da ordem de serviço.'),
            OpenApiParameter('status', str, description='Filtrar por status.', enum=StatusServico),
            OpenApiParameter('catalogo', int, description='Filtrar pelo ID do catálogo.'),
            OpenApiParameter('setor', int, description='Filtrar pelo ID do setor.'),
            OpenApiParameter('prioridade', str, description='Filtrar por prioridade.', enum=Prioridade),
            OpenApiParameter('atrasada', str, description='Se "true", retorna apenas serviços com prazo vencido e não concluídos/cancelados.', enum=['true']),
            OpenApiParameter('ordering', str, description='Ordenar por prazo. Use "prazo" ou "-prazo".', enum=['prazo', '-prazo']),
        ],
    ),
    create=extend_schema(
        summary='Criar serviço',
        description=(
            'Cria um novo serviço vinculado a uma OS. '
            'Campos calculados (`status`, `data_inicio`, `data_termino`, `data_conclusao`, '
            '`terminado_por`) são somente leitura e gerenciados automaticamente pelas tarefas. '
            '`setor` é somente leitura e copiado do catálogo.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar serviço',
        description='Retorna todos os campos de um serviço pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar serviço',
        description=(
            'Substitui integralmente os dados de um serviço. '
            'Campos calculados são somente leitura e ignorados no body.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar serviço parcialmente',
        description=(
            'Atualiza um ou mais campos de um serviço. '
            'Campos calculados são somente leitura e ignorados no body.'
        ),
    ),
    destroy=extend_schema(
        summary='Remover serviço',
        description='Remove permanentemente um serviço e suas tarefas vinculadas.',
    ),
)
class ServicoViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = Servico.objects.select_related(
        'ordem_servico__cliente',
        'catalogo',
        'setor',
        'terminado_por',
    ).prefetch_related('tarefas').all()
    permission_classes = [IsAuthenticated, PodeGerenciarServico]
    permissoes_por_acao = {
        'create': (Permissao.OS_GERENCIAR,),
        'update': (Permissao.OS_GERENCIAR, Permissao.SERVICOS_GERENCIAR,),
        'partial_update': (Permissao.OS_GERENCIAR, Permissao.SERVICOS_GERENCIAR,),
        'destroy': (Permissao.OS_GERENCIAR, Permissao.SERVICOS_GERENCIAR,),
        'sincronizar': (Permissao.OS_GERENCIAR, Permissao.SERVICOS_GERENCIAR,),
    }

    def get_serializer_class(self):
        if self.action == 'list':
            return ServicoListSerializer
        return ServicoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        queryset = servicos_visiveis(queryset, user)

        ordem_id = self.request.query_params.get('ordem_servico', '').strip()
        status_param = self.request.query_params.get('status', '').strip()
        catalogo_id = self.request.query_params.get('catalogo', '').strip()
        setor_id = self.request.query_params.get('setor', '').strip()
        prioridade_param = self.request.query_params.get('prioridade', '').strip()
        atrasada_param = self.request.query_params.get('atrasada', '').strip()
        ordering_param = self.request.query_params.get('ordering', '').strip()

        if ordem_id:
            queryset = queryset.filter(ordem_servico_id=ordem_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if catalogo_id:
            queryset = queryset.filter(catalogo_id=catalogo_id)
        if setor_id:
            queryset = queryset.filter(setor_id=setor_id)
        if prioridade_param:
            queryset = queryset.filter(prioridade=prioridade_param)
        if atrasada_param == 'true':
            queryset = queryset.filter(prazo__lt=timezone.localdate()).exclude(
                status__in=[StatusServico.CONCLUIDA, StatusServico.CANCELADO]
            )
        if ordering_param in ('prazo', '-prazo'):
            queryset = queryset.order_by(ordering_param)

        return queryset

    @extend_schema(
        summary='Linha do tempo do serviço',
        description=(
            'O que aconteceu, em eventos legíveis e em ordem cronológica, montados a partir da auditoria. '
            'Condições de pagamento e a referência do lançamento só para quem tem `financeiro.ver_valores`. '
            'Acessa quem vê o serviço; traz só o serviço e suas tarefas.'
        ),
        responses={200: EventoDaLinhaDoTempoSerializer(many=True)},
    )
    @action(detail=True, methods=['get'], url_path='linha-do-tempo')
    def linha_do_tempo(self, request, pk=None):
        eventos = linha_do_tempo.linha_do_tempo_do_servico(self.get_object(), request.user)
        return Response(EventoDaLinhaDoTempoSerializer(eventos, many=True).data)

    @extend_schema(
        summary='Sincronizar status do serviço',
        description=(
            'Força a ressincronização do status, datas e responsável do serviço '
            'com base no estado atual de suas tarefas. '
            'Normalmente executado automaticamente por signals — use este endpoint '
            'apenas para corrigir inconsistências manualmente.'
        ),
        request=None,
        responses={200: ServicoSerializer},
    )
    @action(detail=True, methods=['post'], url_path='sincronizar')
    def sincronizar(self, request, pk=None):
        servico = self.get_object()
        servico.sincronizar_status_e_rastreio()
        return Response(ServicoSerializer(servico, context={'request': request}).data)
