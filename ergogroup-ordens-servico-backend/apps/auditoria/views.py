from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.auditoria.models import EntidadeAuditada, AcaoAuditoria, RegistroAuditoria
from apps.auditoria.serializers import RegistroAuditoriaSerializer
from apps.organizacoes.permissoes import Permissao, TemPermissao

_FILTROS_PARAMS = [
    OpenApiParameter(
        'entidade', description='Filtrar por entidade auditada.',
        required=False, enum=EntidadeAuditada,
    ),
    OpenApiParameter(
        'objeto_id', description='Filtrar pelo ID do objeto auditado.',
        required=False, type=int,
    ),
    OpenApiParameter(
        'acao', description='Filtrar pelo tipo de ação registrada.',
        required=False, enum=AcaoAuditoria,
    ),
    OpenApiParameter(
        'ordem_servico', description='Filtrar pelo ID da ordem de serviço.',
        required=False, type=int,
    ),
    OpenApiParameter(
        'servico', description='Filtrar pelo ID do serviço.',
        required=False, type=int,
    ),
    OpenApiParameter(
        'tarefa', description='Filtrar pelo ID da tarefa.',
        required=False, type=int,
    ),
    OpenApiParameter(
        'mini_os', description='Filtrar pelo ID da mini OS.',
        required=False, type=int,
    ),
]


@extend_schema_view(
    list=extend_schema(
        summary='Listar registros de auditoria',
        description=(
            'Retorna a lista paginada de todos os registros de auditoria. '
            'Suporta filtragem por entidade, objeto, ação e vínculo com '
            'ordens de serviço, serviços, tarefas e mini OS.'
        ),
        parameters=_FILTROS_PARAMS,
    ),
    retrieve=extend_schema(
        summary='Detalhar registro de auditoria',
        description='Retorna um único registro de auditoria pelo seu ID.',
    ),
)
class RegistroAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), TemPermissao(Permissao.AUDITORIA_VER)]

    def get_queryset(self):
        queryset = RegistroAuditoria.objects.select_related('usuario').all()
        filtros = {
            'entidade': 'entidade',
            'objeto_id': 'objeto_id',
            'acao': 'acao',
            'ordem_servico': 'ordem_servico_id',
            'servico': 'servico_id',
            'tarefa': 'tarefa_id',
            'mini_os': 'mini_os_id',
        }
        for param, campo in filtros.items():
            valor = self.request.query_params.get(param)
            if valor:
                queryset = queryset.filter(**{campo: valor})
        return queryset

    @extend_schema(
        summary='Timeline de uma ordem de serviço',
        description=(
            'Retorna todos os registros de auditoria vinculados a uma ordem '
            'de serviço, em ordem cronológica decrescente.'
        ),
        parameters=[
            OpenApiParameter(
                'ordem_servico_id', location=OpenApiParameter.PATH,
                description='ID da ordem de serviço.', type=int,
            ),
        ] + _FILTROS_PARAMS,
        responses={200: RegistroAuditoriaSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='ordens/(?P<ordem_servico_id>[^/.]+)/timeline')
    def timeline_ordem(self, request, ordem_servico_id=None):
        queryset = self.get_queryset().filter(ordem_servico_id=ordem_servico_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Timeline de uma mini OS',
        description=(
            'Retorna todos os registros de auditoria vinculados a uma mini OS, '
            'em ordem cronológica decrescente.'
        ),
        parameters=[
            OpenApiParameter(
                'mini_os_id', location=OpenApiParameter.PATH,
                description='ID da mini OS.', type=int,
            ),
        ] + _FILTROS_PARAMS,
        responses={200: RegistroAuditoriaSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='mini-os/(?P<mini_os_id>[^/.]+)/timeline')
    def timeline_mini_os(self, request, mini_os_id=None):
        queryset = self.get_queryset().filter(mini_os_id=mini_os_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
