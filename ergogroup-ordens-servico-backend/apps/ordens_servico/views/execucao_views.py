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

from apps.ordens_servico.models import Servico, Tarefa
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.serializers.execucao_serializer import (
    AlertaSerializer,
    CienciaSerializer,
    ConcluidosSerializer,
    ContadoresMeusServicosSerializer,
    DetalheDoServicoSerializer,
    DistribuirSerializer,
    ItemDaFilaSerializer,
    LinhaDeTarefaSerializer,
    MembroDaEquipeSerializer,
    ReceberServicosSerializer,
    ReceberTarefasSerializer,
    ServicosRecebidosSerializer,
    SetorAcompanhadoSerializer,
    TarefasRecebidasSerializer,
)
from apps.ordens_servico.services import execucao
from apps.ordens_servico.services.visibilidade import servicos_visiveis, tarefas_visiveis
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


def _etapa(request, permitidas):
    valor = request.query_params.get('etapa', '').strip() or None
    if valor is not None and valor not in permitidas:
        raise ValidationError({'etapa': f'Use {", ".join(permitidas)} ou deixe em branco.'})
    return valor


def _todos_ou_404(queryset, ids):
    """Os objetos dos `ids` que a pessoa vê; se faltar algum, 404 (não revela o que ela não vê)."""
    ids = list(dict.fromkeys(ids))
    objetos = {objeto.id: objeto for objeto in queryset.filter(pk__in=ids)}
    faltando = [pk for pk in ids if pk not in objetos]
    if faltando:
        raise NotFound(f'Não encontrado: {", ".join(map(str, faltando))}.')
    return [objetos[pk] for pk in ids]


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
            'Serviços do setor que chegaram e ainda não foram distribuídos: os novos (sem ciência do setor) '
            'primeiro, depois os a distribuir; em cada grupo, os mais antigos primeiro. Traz o contexto da venda e '
            'os outros serviços da mesma OS. Agrupar por cliente ou por OS é decisão da tela.'
        ),
        parameters=[
            PARAMETRO_SETOR,
            OpenApiParameter('etapa', str, enum=['novo', 'a_distribuir'], description='Só uma das etapas.'),
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
        filtros['etapa'] = _etapa(request, execucao.ETAPAS_DA_FILA)
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
        parameters=[
            PARAMETRO_SETOR,
            OpenApiParameter('responsavel', int, description='Filtrar pelo responsável.'),
            OpenApiParameter('etapa', str, enum=list(execucao.ETAPAS_ATIVAS_TAREFA), description='Etapa da tarefa.'),
        ],
        responses={200: LinhaDeTarefaSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        setor = setor_acompanhado(request)
        linhas = execucao.andamento(setor, request.query_params.get('responsavel'),
                                    _etapa(request, execucao.ETAPAS_ATIVAS_TAREFA))
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
        summary='Explicar a pausa',
        description=(
            'O serviço está sem andamento porque espera algo: o motivo (obrigatório; "outro" exige a observação) '
            'silencia o aviso por N dias e fica visível para o setor (`ciencia_ate`). Se o trabalho andou, o certo é '
            'atualizar a tarefa. Pode explicar quem tem tarefa no serviço ou quem acompanha o setor.'
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
            'Por pessoa que recebe tarefas do setor (lotada com "Recebe tarefas" ou que "também executa" aqui): '
            'itens ativos por situação de prazo, em alerta e idade do mais antigo. Inclui quem ainda tem tarefa ativa '
            'no setor sem receber mais (`recebe_tarefas` falso). Serve de lista de responsáveis na distribuição: só '
            'quem tem `recebe_tarefas` pode ser escolhido.'
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
                    OpenApiParameter('etapa', str, enum=list(execucao.ETAPAS_ATIVAS_TAREFA),
                                     description='Etapa da tarefa (sem `status`).'),
                    *PERIODO],
        responses={200: LinhaDeTarefaSerializer(many=True)},
        tags=['execução'],
    )
    def get(self, request):
        status_param = request.query_params.get('status', '').strip() or None
        if status_param not in (None, StatusTarefa.CONCLUIDA):
            raise ValidationError({'status': 'Use `concluida` ou deixe em branco.'})
        linhas = execucao.meus_servicos(request.user, status_param, _data(request, 'de'), _data(request, 'ate'),
                                        _etapa(request, execucao.ETAPAS_ATIVAS_TAREFA))
        return Response(LinhaDeTarefaSerializer(linhas, many=True).data)


class ContadoresMeusServicosView(APIView):
    @extend_schema(
        summary='Contadores de Meus serviços',
        description='Quantas tarefas ativas da pessoa estão em cada etapa: nova, a iniciar e em andamento.',
        responses={200: ContadoresMeusServicosSerializer},
        tags=['execução'],
    )
    def get(self, request):
        return Response(ContadoresMeusServicosSerializer(execucao.contadores_meus_servicos(request.user)).data)


class ReceberServicosView(APIView):
    @extend_schema(
        summary='Confirmar recebimento de serviços',
        description=(
            'Ciência do setor de que os serviços chegaram (ADR 0009): passam de novo para a distribuir. Aceita '
            'vários de uma vez. Exige `tarefas.distribuir` no setor de cada serviço; se faltar em algum, nada é '
            'gravado. Serviço que já tinha ciência volta em `ja_recebidos`. Distribuir também registra a ciência.'
        ),
        request=ReceberServicosSerializer,
        responses={200: ServicosRecebidosSerializer},
        tags=['execução'],
    )
    def post(self, request):
        dados = ReceberServicosSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        servicos = _todos_ou_404(servicos_visiveis(Servico.objects.all(), request.user),
                                 dados.validated_data['servicos'])
        try:
            resultado = execucao.receber_servicos(servicos, por=request.user)
        except execucao.RecebimentoInvalido as exc:
            raise ValidationError({'servicos': f'Concluídos ou cancelados: {", ".join(map(str, exc.args[0]))}.'})
        return Response(ServicosRecebidosSerializer(resultado).data)


class ReceberTarefasView(APIView):
    @extend_schema(
        summary='Confirmar recebimento de tarefas',
        description=(
            'Ciência do responsável de que a tarefa é dele (ADR 0009): passa de nova para a iniciar. Aceita várias '
            'de uma vez. Só o responsável confirma; se alguma não for dele, nada é gravado. Começar a tarefa também '
            'registra a ciência; trocar o responsável a zera.'
        ),
        request=ReceberTarefasSerializer,
        responses={200: TarefasRecebidasSerializer},
        tags=['execução'],
    )
    def post(self, request):
        dados = ReceberTarefasSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        tarefas = _todos_ou_404(tarefas_visiveis(Tarefa.objects.select_related('servico'), request.user),
                                dados.validated_data['tarefas'])
        try:
            resultado = execucao.receber_tarefas(tarefas, por=request.user)
        except execucao.RecebimentoInvalido as exc:
            raise ValidationError({'tarefas': f'Concluídas ou canceladas: {", ".join(map(str, exc.args[0]))}.'})
        return Response(TarefasRecebidasSerializer(resultado).data)


class DetalheDoServicoView(APIView):
    @extend_schema(
        summary='Detalhe do serviço',
        description=(
            'O serviço com tarefas, prazo, alerta e ciência, o contexto da venda (sem valores) e os outros serviços '
            'da mesma OS. `pode_distribuir`, `pode_dar_ciencia` e `pode_confirmar_recebimento` (no serviço e em '
            'cada tarefa) dizem quais ações mostrar.'
        ),
        responses={200: DetalheDoServicoSerializer},
        tags=['execução'],
    )
    def get(self, request, pk):
        return _detalhe(servico_visivel(request, pk), request)
