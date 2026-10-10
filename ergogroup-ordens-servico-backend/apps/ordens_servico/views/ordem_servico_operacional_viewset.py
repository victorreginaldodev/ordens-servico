from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.organizacoes.permissoes import Permissao, PermissoesPorAcaoMixin, tem_permissao
from apps.ordens_servico.models import OrdemServicoOperacional, Prioridade
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional
from apps.ordens_servico.serializers import (
    OrdemServicoOperacionalListSerializer,
    OrdemServicoOperacionalSerializer,
    RegistrarCobrancaOSORequestSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary='Listar Ordens de Serviço Operacionais',
        description=(
            'Retorna a lista paginada de Ordens de Serviço Operacionais. '
            'Técnicos veem apenas as próprias; demais perfis veem todas.'
        ),
        parameters=[
            OpenApiParameter('q', str, description='Busca por nome do cliente ou catálogo operacional (parcial).'),
            OpenApiParameter('cliente', int, description='Filtrar pelo ID do cliente.'),
            OpenApiParameter('responsavel', int, description='Filtrar pelo ID do responsável.'),
            OpenApiParameter('status', str, description='Filtrar por status.', enum=StatusOrdemServicoOperacional),
            OpenApiParameter('cobranca_realizada', str, description='Filtrar por status de cobrança.', enum=['true', 'false']),
            OpenApiParameter('prioridade', str, description='Filtrar por prioridade.', enum=Prioridade),
            OpenApiParameter('atrasada', str, description='Se "true", retorna apenas OSOs com prazo vencido e não finalizadas.', enum=['true']),
            OpenApiParameter('ordering', str, description='Ordenar por prazo. Use "prazo" ou "-prazo".', enum=['prazo', '-prazo']),
        ],
    ),
    create=extend_schema(
        summary='Criar Ordem de Serviço Operacional',
        description=(
            'Cria uma nova Ordem de Serviço Operacional. Se `revisao_cliente=true`, `gera_cobranca` é definido '
            'automaticamente como `true` e, ao finalizar, `data_liberacao_cobranca` e '
            '`liberada_cobranca_por` são preenchidos automaticamente.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar Ordem de Serviço Operacional',
        description='Retorna todos os campos de uma Ordem de Serviço Operacional pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar Ordem de Serviço Operacional',
        description=(
            'Substitui integralmente os dados de uma Ordem de Serviço Operacional. '
            'Campos calculados (`gera_cobranca`, `data_liberacao_cobranca`, '
            '`liberada_cobranca_por`, `cobranca_realizada_por`) são somente leitura.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar Ordem de Serviço Operacional parcialmente',
        description=(
            'Atualiza um ou mais campos de uma Ordem de Serviço Operacional. '
            'Campos calculados são somente leitura e ignorados no body.'
        ),
    ),
    destroy=extend_schema(
        summary='Remover Ordem de Serviço Operacional',
        description='Remove permanentemente uma Ordem de Serviço Operacional.',
    ),
)
class OrdemServicoOperacionalViewSet(PermissoesPorAcaoMixin, viewsets.ModelViewSet):
    queryset = OrdemServicoOperacional.objects.select_related(
        'cliente',
        'catalogo_operacional',
        'responsavel',
        'liberada_cobranca_por',
        'cobranca_realizada_por',
    ).all()
    permission_classes = [IsAuthenticated]
    permissoes_por_acao = {
        'create': (Permissao.OS_OPERACIONAL_GERENCIAR,),
        'update': (Permissao.OS_OPERACIONAL_GERENCIAR,),
        'partial_update': (Permissao.OS_OPERACIONAL_GERENCIAR,),
        'destroy': (Permissao.OS_OPERACIONAL_GERENCIAR,),
        'registrar_cobranca': (Permissao.FINANCEIRO_REGISTRAR_COBRANCA,),
    }

    def get_serializer_class(self):
        if self.action == 'list':
            return OrdemServicoOperacionalListSerializer
        return OrdemServicoOperacionalSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not tem_permissao(user, Permissao.OS_VER_TODAS):
            queryset = queryset.filter(responsavel=user)

        q = self.request.query_params.get('q', '').strip()
        cliente_id = self.request.query_params.get('cliente', '').strip()
        responsavel_id = self.request.query_params.get('responsavel', '').strip()
        status_param = self.request.query_params.get('status', '').strip()
        cobranca_realizada = self.request.query_params.get('cobranca_realizada', '').strip()
        prioridade_param = self.request.query_params.get('prioridade', '').strip()
        atrasada_param = self.request.query_params.get('atrasada', '').strip()
        ordering_param = self.request.query_params.get('ordering', '').strip()

        if q:
            queryset = queryset.filter(
                Q(cliente__nome__icontains=q) | Q(catalogo_operacional__nome__icontains=q)
            )
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        if responsavel_id:
            queryset = queryset.filter(responsavel_id=responsavel_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if cobranca_realizada in ('true', 'false'):
            queryset = queryset.filter(cobranca_realizada=(cobranca_realizada == 'true'))
        if prioridade_param:
            queryset = queryset.filter(prioridade=prioridade_param)
        if atrasada_param == 'true':
            queryset = queryset.filter(prazo__lt=timezone.localdate()).exclude(
                status=StatusOrdemServicoOperacional.FINALIZADA
            )
        if ordering_param in ('prazo', '-prazo'):
            queryset = queryset.order_by(ordering_param)

        return queryset

    @extend_schema(
        summary='Registrar cobrança da Ordem de Serviço Operacional',
        description=(
            'Marca a Ordem de Serviço Operacional como tendo a cobrança realizada, registrando o número da NF e o usuário responsável. '
            'Retorna 400 se ela não gerar cobrança ou ainda não estiver liberada para cobrança.'
        ),
        request=RegistrarCobrancaOSORequestSerializer,
        responses={
            200: OrdemServicoOperacionalSerializer,
            400: None,
        },
    )
    @action(detail=True, methods=['patch'], url_path='cobranca')
    def registrar_cobranca(self, request, pk=None):
        oso = self.get_object()
        if not oso.gera_cobranca:
            return Response(
                {'detail': 'Ordem de Serviço Operacional não gera cobrança.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if oso.data_liberacao_cobranca is None:
            return Response(
                {'detail': 'Ordem de Serviço Operacional ainda não está liberada para cobrança.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        numero_nf = request.data.get('numero_nf')
        oso.cobranca_realizada = True
        oso.numero_nf = numero_nf
        oso.cobranca_realizada_por = request.user
        oso.save(update_fields=['cobranca_realizada', 'numero_nf', 'cobranca_realizada_por', 'atualizado_em'])
        return Response(OrdemServicoOperacionalSerializer(oso, context={'request': request}).data)
