"""Endpoints dos blocos da execução (fase 8). Só orquestram e conferem permissão; a lógica está em
`services/execucao.py`. Os blocos por setor recebem `?setor=<id>` e exigem `servicos.ver_setor` nele."""
from datetime import date

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ordens_servico.models import Servico
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.serializers.execucao_serializer import (
    AlertaSerializer,
    CienciaSerializer,
    ConcluidosSerializer,
    DetalheDoServicoSerializer,
    DistribuirSerializer,
    ItemDaFilaSerializer,
    LinhaDeTarefaSerializer,
    MembroDaEquipeSerializer,
    SetorAcompanhadoSerializer,
)
from apps.ordens_servico.services import execucao
from apps.ordens_servico.services.visibilidade import servicos_visiveis
from apps.organizacoes.models import Setor
from apps.organizacoes.permissoes import Permissao, setores_com_permissao

PARAMETRO_SETOR = OpenApiParameter('setor', int, required=True, description='ID do setor.')
PERIODO = [
    OpenApiParameter('de', str, description='Data inicial (AAAA-MM-DD). Padrão: primeiro dia do mês atual.'),
    OpenApiParameter('ate', str, description='Data final (AAAA-MM-DD). Padrão: hoje.'),
]


def _data(request, parametro):
    valor = request.query_params.get(parametro, '').strip()
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({parametro: 'Use o formato AAAA-MM-DD.'})


def setor_acompanhado(request):
    """O setor de `?setor=`, conferindo que a pessoa o acompanha (`servicos.ver_setor` nele)."""
    valor = request.query_params.get('setor', '').strip()
    if not valor.isdigit():
        raise ValidationError({'setor': 'Informe o ID do setor.'})
    setor = Setor.objects.filter(pk=valor).first()
    if setor is None:
        raise NotFound('Setor não encontrado.')
    if not execucao.acompanha(request.user, setor):
        raise PermissionDenied('Seu perfil não acompanha este setor.')
    return setor


def servico_visivel(request, pk):
    return get_object_or_404(servicos_visiveis(Servico.objects.all(), request.user), pk=pk)


def _detalhe(servico, request, codigo=status.HTTP_200_OK):
    dados = execucao.detalhe_do_servico(servico, request.user)
    return Response(DetalheDoServicoSerializer(dados).data, status=codigo)


class SetoresAcompanhadosView(APIView):
    @extend_schema(
        summary='Setores que acompanho',
        description=(
            'Setores em que a pessoa tem `servicos.ver_setor` (com `setores.todos`, todos os setores de execução), '
            'com os contadores do painel. `organiza` indica se ela pode distribuir no setor.'
        ),
        responses={200: SetorAcompanhadoSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        if setores_com_permissao(request.user, Permissao.SERVICOS_VER_SETOR) == set():
            raise PermissionDenied('Seu perfil não acompanha nenhum setor.')
        return Response(SetorAcompanhadoSerializer(execucao.resumo_dos_setores(request.user), many=True).data)


class FilaView(APIView):
    @extend_schema(
        summary='Fila de triagem do setor',
        description=(
            'Serviços do setor que chegaram e ainda não foram distribuídos, mais antigos primeiro, com o contexto '
            'da venda e os outros serviços da mesma OS. Agrupar por cliente ou por OS é decisão da tela.'
        ),
        parameters=[
            PARAMETRO_SETOR,
            OpenApiParameter('cliente', int, description='Filtrar pelo cliente.'),
            OpenApiParameter('ordem_servico', int, description='Filtrar pela OS.'),
            OpenApiParameter('prioridade', str, description='Filtrar pela prioridade.'),
        ],
        responses={200: ItemDaFilaSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        setor = setor_acompanhado(request)
        filtros = {chave: request.query_params.get(chave) for chave in ('cliente', 'ordem_servico', 'prioridade')}
        return Response(ItemDaFilaSerializer(execucao.fila(setor, filtros), many=True).data)


class DistribuirView(APIView):
    @extend_schema(
        summary='Distribuir o serviço',
        description=(
            'Cria as tarefas do serviço em um passo: responsável e prazo. Uma tarefa distribui para uma pessoa; '
            'várias dividem o serviço. Também acrescenta tarefas a um serviço já distribuído. Exige '
            '`tarefas.distribuir` no setor do serviço, e cada responsável precisa pertencer ao setor.'
        ),
        request=DistribuirSerializer,
        responses={201: DetalheDoServicoSerializer},
        tags=['execução'],
    )
    def post(self, request, pk):
        servico = servico_visivel(request, pk)
        dados = DistribuirSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        try:
            execucao.distribuir(servico, dados.validated_data['tarefas'], por=request.user)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict)
        return _detalhe(servico, request, status.HTTP_201_CREATED)


class AndamentoView(APIView):
    @extend_schema(
        summary='Em andamento no setor',
        description='Tarefas ativas do setor, as mais urgentes primeiro. A tela agrupa por responsável.',
        parameters=[PARAMETRO_SETOR, OpenApiParameter('responsavel', int, description='Filtrar pelo responsável.')],
        responses={200: LinhaDeTarefaSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        setor = setor_acompanhado(request)
        linhas = execucao.andamento(setor, request.query_params.get('responsavel'))
        return Response(LinhaDeTarefaSerializer(linhas, many=True).data)


class AlertasView(APIView):
    @extend_schema(
        summary='Alertas do setor',
        description=(
            'Serviços ativos atrasados ou sem movimentação há N dias (`DIAS_ALERTA_SEM_MOVIMENTACAO`), com os '
            'motivos e a ciência vigente. Os atrasados vêm primeiro.'
        ),
        parameters=[PARAMETRO_SETOR],
        responses={200: AlertaSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        setor = setor_acompanhado(request)
        return Response(AlertaSerializer(execucao.alertas(setor), many=True).data)


class CienciaView(APIView):
    @extend_schema(
        summary='Estou ciente do alerta',
        description=(
            '"Está tudo bem, deixar assim": silencia o alerta de serviço sem movimentação por mais N dias, com '
            'motivo opcional. Pode dar ciência quem tem tarefa no serviço ou quem acompanha o setor.'
        ),
        request=CienciaSerializer,
        responses={200: DetalheDoServicoSerializer},
        tags=['execução'],
    )
    def post(self, request, pk):
        servico = servico_visivel(request, pk)
        if not execucao.pode_dar_ciencia(request.user, servico):
            raise PermissionDenied('Só quem tem tarefa no serviço ou acompanha o setor pode dar ciência.')
        if not servico.ativo:
            raise ValidationError({'detail': 'O serviço não está aberto nem em andamento.'})
        dados = CienciaSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        servico.registrar_ciencia(request.user, dados.validated_data.get('motivo'),
                                  dados.validated_data.get('observacao'))
        return _detalhe(servico, request)


class ConcluidosView(APIView):
    @extend_schema(
        summary='Concluídos no período',
        description='Serviços do setor concluídos entre `de` e `ate`, com quem concluiu e se foi dentro do prazo.',
        parameters=[PARAMETRO_SETOR, *PERIODO],
        responses={200: ConcluidosSerializer},
        tags=['execução'],
    )
    def get(self, request):
        setor = setor_acompanhado(request)
        dados = execucao.concluidos(setor, _data(request, 'de'), _data(request, 'ate'))
        return Response(ConcluidosSerializer(dados).data)


class EquipeView(APIView):
    @extend_schema(
        summary='Equipe e carga do setor',
        description=(
            'Por membro do setor: itens ativos por situação de prazo, em alerta e idade do mais antigo. Inclui quem '
            'ainda tem tarefa ativa no setor sem ser membro. Serve também de lista de responsáveis na distribuição '
            '(só os membros podem receber tarefas).'
        ),
        parameters=[PARAMETRO_SETOR],
        responses={200: MembroDaEquipeSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        setor = setor_acompanhado(request)
        return Response(MembroDaEquipeSerializer(execucao.equipe(setor), many=True).data)


class MeusServicosView(APIView):
    @extend_schema(
        summary='Meus serviços',
        description=(
            'O que está com a pessoa, os mais urgentes primeiro. Com `status=concluida`, o histórico do período. '
            'Não exige permissão: cada um vê só o que é seu.'
        ),
        parameters=[OpenApiParameter('status', str, enum=['concluida'], description='Histórico de concluídas.'),
                    *PERIODO],
        responses={200: LinhaDeTarefaSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        status_param = request.query_params.get('status', '').strip() or None
        if status_param not in (None, StatusTarefa.CONCLUIDA):
            raise ValidationError({'status': 'Use `concluida` ou deixe em branco.'})
        linhas = execucao.meus_servicos(request.user, status_param, _data(request, 'de'), _data(request, 'ate'))
        return Response(LinhaDeTarefaSerializer(linhas, many=True).data)


class DetalheDoServicoView(APIView):
    @extend_schema(
        summary='Detalhe do serviço',
        description=(
            'O serviço com tarefas, prazo, alerta e ciência, o contexto da venda (sem valores) e os outros serviços '
            'da mesma OS. `pode_distribuir` e `pode_dar_ciencia` dizem quais ações mostrar.'
        ),
        responses={200: DetalheDoServicoSerializer},
        tags=['execução'],
    )
    def get(self, request, pk):
        return _detalhe(servico_visivel(request, pk), request)
