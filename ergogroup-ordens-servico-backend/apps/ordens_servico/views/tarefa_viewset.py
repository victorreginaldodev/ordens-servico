from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.ordens_servico.services.visibilidade import tarefas_visiveis
from apps.organizacoes.permissoes import Permissao, tem_permissao
from apps.ordens_servico.models import Tarefa, Prioridade
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.serializers import TarefaListSerializer, TarefaSerializer


class PodeModificarTarefa(BasePermission):
    """Distribuir (criar, reatribuir, excluir) exige `tarefas.distribuir`; editar tarefa de outra pessoa
    exige `tarefas.editar_setor`. As duas valem no setor do serviço da tarefa. Sem elas, o responsável só
    altera o status da própria tarefa."""

    CAMPOS_DO_RESPONSAVEL = {'status'}

    def has_permission(self, request, view):
        # Aqui o setor ainda não é conhecido; a verificação no setor do serviço fica em perform_create.
        if view.action == 'create' and not tem_permissao(request.user, Permissao.TAREFAS_DISTRIBUIR):
            self.message = 'Seu perfil não pode criar tarefas.'
            return False
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        setor = obj.servico.setor_id
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        if view.action == 'destroy':
            self.message = 'Seu perfil não pode excluir tarefas deste setor.'
            return tem_permissao(user, Permissao.TAREFAS_DISTRIBUIR, setor)

        campos = set(request.data.keys())
        novo_responsavel = request.data.get('responsavel')
        if (
            novo_responsavel is not None
            and str(novo_responsavel) != str(obj.responsavel_id)
            and not tem_permissao(user, Permissao.TAREFAS_DISTRIBUIR, setor)
        ):
            self.message = 'Seu perfil não pode reatribuir tarefas deste setor.'
            return False
        if tem_permissao(user, Permissao.TAREFAS_EDITAR_SETOR, setor):
            return True
        if obj.responsavel_id != user.id:
            self.message = 'Apenas o responsável pela tarefa pode modificá-la.'
            return False
        if not campos <= self.CAMPOS_DO_RESPONSAVEL:
            self.message = 'O responsável pode alterar apenas o status da própria tarefa.'
            return False
        return True


@extend_schema_view(
    list=extend_schema(
        summary='Listar tarefas',
        description=(
            'Retorna a lista paginada de tarefas. '
            'Técnicos veem apenas as próprias tarefas; demais perfis veem todas.'
        ),
        parameters=[
            OpenApiParameter('servico', int, description='Filtrar pelo ID do serviço.'),
            OpenApiParameter('responsavel', int, description='Filtrar pelo ID do responsável.'),
            OpenApiParameter('status', str, description='Filtrar por status.', enum=StatusTarefa),
            OpenApiParameter('prioridade', str, description='Filtrar por prioridade.', enum=Prioridade),
            OpenApiParameter('atrasada', str, description='Se "true", retorna apenas tarefas com prazo vencido e não concluídas/canceladas.', enum=['true']),
            OpenApiParameter('ordering', str, description='Ordenar por prazo. Use "prazo" ou "-prazo".', enum=['prazo', '-prazo']),
        ],
    ),
    create=extend_schema(
        summary='Criar tarefa',
        description=(
            'Cria uma nova tarefa vinculada a um serviço. '
            'Campos calculados (`data_inicio`, `data_termino`) são gerenciados '
            'automaticamente conforme o status da tarefa.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar tarefa',
        description='Retorna todos os campos de uma tarefa pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar tarefa',
        description=(
            'Substitui integralmente os dados de uma tarefa. '
            'Alterar o `status` para `em_andamento` ou `concluida` preenche '
            '`data_inicio` e `data_termino` automaticamente.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar tarefa parcialmente',
        description=(
            'Atualiza um ou mais campos de uma tarefa. '
            'Alterar o `status` para `em_andamento` ou `concluida` preenche '
            '`data_inicio` e `data_termino` automaticamente.'
        ),
    ),
    destroy=extend_schema(
        summary='Remover tarefa',
        description='Remove permanentemente uma tarefa e ressincroniza o status do serviço vinculado.',
    ),
)
class TarefaViewSet(viewsets.ModelViewSet):
    queryset = Tarefa.objects.select_related(
        'responsavel',
        'servico__catalogo',
        'servico__ordem_servico__cliente',
    ).all()
    permission_classes = [IsAuthenticated, PodeModificarTarefa]

    def get_serializer_class(self):
        if self.action == 'list':
            return TarefaListSerializer
        return TarefaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        queryset = tarefas_visiveis(queryset, user)

        servico_id = self.request.query_params.get('servico', '').strip()
        responsavel_id = self.request.query_params.get('responsavel', '').strip()
        status_param = self.request.query_params.get('status', '').strip()
        prioridade_param = self.request.query_params.get('prioridade', '').strip()
        atrasada_param = self.request.query_params.get('atrasada', '').strip()
        ordering_param = self.request.query_params.get('ordering', '').strip()

        if servico_id:
            queryset = queryset.filter(servico_id=servico_id)
        if responsavel_id:
            queryset = queryset.filter(responsavel_id=responsavel_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if prioridade_param:
            queryset = queryset.filter(prioridade=prioridade_param)
        if atrasada_param == 'true':
            queryset = queryset.filter(prazo__lt=timezone.localdate()).exclude(
                status__in=[StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA]
            )
        if ordering_param in ('prazo', '-prazo'):
            queryset = queryset.order_by(ordering_param)

        return queryset
