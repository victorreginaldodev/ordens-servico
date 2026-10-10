from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.ordens_servico.serializers.linha_do_tempo_serializer import EventoDaLinhaDoTempoSerializer
from apps.ordens_servico.services import comercial, linha_do_tempo
from apps.ordens_servico.services.visibilidade import ordens_visiveis
from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin
from apps.ordens_servico.models import OrdemServico
from apps.ordens_servico.serializers import (
    OrdemServicoListSerializer,
    OrdemServicoSerializer,
    RegistrarCobrancaRequestSerializer,
    LiberadaCobrancaSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary='Listar ordens de serviço',
        description=(
            'Retorna a lista paginada de ordens de serviço com campos resumidos, '
            'ordenadas por status de cobrança e data da venda. '
            'Suporta busca textual e filtragem por cliente, conclusão, cobrança e liberação.'
        ),
        parameters=[
            OpenApiParameter('q', str, description='Busca por nome do cliente ou observação (parcial).'),
            OpenApiParameter('cliente', int, description='Filtrar pelo ID do cliente.'),
            OpenApiParameter('concluida', str, description='Filtrar por conclusão.', enum=['true', 'false']),
            OpenApiParameter('cobranca_realizada', str, description='Filtrar por status de cobrança.', enum=['true', 'false']),
            OpenApiParameter('liberada', str, description='Filtrar por liberação para cobrança.', enum=['true', 'false']),
            OpenApiParameter('minhas', str, description='Se "true", só as vendas registradas pelo usuário.', enum=['true']),
            OpenApiParameter(
                'etapa', str, enum=['na_fila', 'distribuido', 'em_execucao', 'concluido', 'cancelado'],
                description='OS com ao menos um serviço na etapa (ex.: `na_fila` = vendas com algo ainda não distribuído).',
            ),
        ],
    ),
    create=extend_schema(
        summary='Criar ordem de serviço',
        description=(
            'Cria uma nova ordem de serviço. O campo `criado_por` é preenchido '
            'automaticamente com o usuário autenticado. Se `liberar_em=venda`, '
            'a OS já é criada com `liberada_para_cobranca=true`; com `liberar_em=conclusao`, '
            'é liberada quando todos os serviços terminam. A condição de pagamento é validada pelo '
            '`tipo_condicao`: parcelado exige ao menos 2 parcelas e o primeiro vencimento '
            '(`data_acordada_cobranca`); recorrente exige o número de meses (`quantidade_parcelas`) '
            'e o `dia_vencimento`.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar ordem de serviço',
        description='Retorna todos os campos de uma ordem de serviço pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar ordem de serviço',
        description=(
            'Substitui integralmente os dados de uma OS. '
            'Campos calculados (`status`, `concluida`, `liberada_para_cobranca`) '
            'são somente leitura e ignorados no body.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar ordem de serviço parcialmente',
        description=(
            'Atualiza um ou mais campos de uma OS. '
            'Campos calculados (`status`, `concluida`, `liberada_para_cobranca`) '
            'são somente leitura e ignorados no body.'
        ),
    ),
    destroy=extend_schema(
        summary='Remover ordem de serviço',
        description='Remove permanentemente uma ordem de serviço.',
    ),
)
class OrdemServicoViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = OrdemServico.objects.select_related(
        'cliente',
        'criado_por',
        'atualizado_por',
        'liberada_para_cobranca_por',
        'cobranca_realizada_por',
    ).prefetch_related('servicos__tarefas__responsavel').all()
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.OS_GERENCIAR,),
        'update': (Permissao.OS_GERENCIAR,),
        'partial_update': (Permissao.OS_GERENCIAR,),
        'destroy': (Permissao.OS_EXCLUIR,),
        'registrar_cobranca': (Permissao.FINANCEIRO_REGISTRAR_COBRANCA,),
    }

    def get_serializer_class(self):
        if self.action == 'list':
            return OrdemServicoListSerializer
        return OrdemServicoSerializer

    def get_queryset(self):
        queryset = super().get_queryset().order_by('cobranca_realizada', '-data_venda')
        user = self.request.user

        queryset = ordens_visiveis(queryset, user)

        q = self.request.query_params.get('q', '').strip()
        cliente_id = self.request.query_params.get('cliente', '').strip()
        concluida = self.request.query_params.get('concluida', '').strip()
        cobranca_realizada = self.request.query_params.get('cobranca_realizada', '').strip()
        liberada = self.request.query_params.get('liberada', '').strip()
        minhas = self.request.query_params.get('minhas', '').strip()
        etapa = self.request.query_params.get('etapa', '').strip()

        if q:
            queryset = queryset.filter(
                Q(cliente__nome__icontains=q) | Q(observacao__icontains=q)
            )
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        if concluida in ('true', 'false'):
            queryset = queryset.filter(concluida=(concluida == 'true'))
        if cobranca_realizada in ('true', 'false'):
            queryset = queryset.filter(cobranca_realizada=(cobranca_realizada == 'true'))
        if liberada in ('true', 'false'):
            queryset = queryset.filter(liberada_para_cobranca=(liberada == 'true'))
        if minhas == 'true':
            queryset = queryset.filter(criado_por=user)
        if etapa in comercial.ETAPAS:
            queryset = comercial.filtrar_por_etapa(queryset, etapa)

        return queryset

    @extend_schema(
        summary='Registrar o lançamento da ordem de serviço',
        description=(
            'Guarda o "check" do financeiro: a OS foi lançada no sistema financeiro externo. Registra a '
            'referência do lançamento, a data, a origem (manual) e o usuário. '
            'Retorna 400 se a OS não estiver liberada para cobrança.'
        ),
        request=RegistrarCobrancaRequestSerializer,
        responses={
            200: OrdemServicoSerializer,
            400: None,
        },
    )
    @action(detail=True, methods=['patch'], url_path='cobranca')
    def registrar_cobranca(self, request, pk=None):
        os = self.get_object()
        dados = RegistrarCobrancaRequestSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        try:
            os.registrar_lancamento(
                dados.validated_data.get('referencia_lancamento'),
                dados.validated_data.get('data_cobranca'),
                por=request.user,
            )
        except DjangoValidationError as exc:
            return Response({'detail': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrdemServicoSerializer(os, context={'request': request}).data)

    @extend_schema(
        summary='Linha do tempo da OS',
        description=(
            'O que aconteceu, em eventos legíveis e em ordem cronológica, montados a partir da auditoria. '
            'Condições de pagamento e a referência do lançamento só para quem tem `financeiro.ver_valores`. '
            'Acessa quem vê a OS; inclui os eventos de todos os serviços e tarefas da OS.'
        ),
        responses={200: EventoDaLinhaDoTempoSerializer(many=True)},
    )
    @action(detail=True, methods=['get'], url_path='linha-do-tempo')
    def linha_do_tempo(self, request, pk=None):
        eventos = linha_do_tempo.linha_do_tempo_da_os(self.get_object(), request.user)
        return Response(EventoDaLinhaDoTempoSerializer(eventos, many=True).data)

    @extend_schema(
        summary='Verificar liberação para cobrança',
        description='Retorna o status de liberação para cobrança da OS, com data e responsável pela liberação.',
        responses={200: LiberadaCobrancaSerializer},
    )
    @action(detail=True, methods=['get'], url_path='liberada-cobranca')
    def liberada_cobranca(self, request, pk=None):
        os = self.get_object()
        return Response({
            'liberada': os.liberada_para_cobranca,
            'liberada_em': os.liberada_para_cobranca_em,
            'liberada_por': os.liberada_para_cobranca_por_id,
        })
