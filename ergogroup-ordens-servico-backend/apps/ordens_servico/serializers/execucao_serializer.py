"""Formato das respostas dos blocos da execução (fase 8). Os dados vêm prontos de `services/execucao.py`;
estes serializers só os apresentam e documentam o contrato da API."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.ordens_servico.models import Prioridade
from apps.ordens_servico.models.servico import MotivoCiencia

ETAPAS = ['na_fila', 'distribuido', 'em_execucao', 'concluido', 'cancelado']
SITUACOES_PRAZO = ['atrasado', 'vence_7_dias', 'depois', 'sem_prazo']


class ContextoDaOSMixin(serializers.Serializer):
    ordem_servico_id = serializers.IntegerField()
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    data_venda = serializers.DateField()
    vendido_por_nome = serializers.CharField(allow_null=True)


class CienciaMixin(serializers.Serializer):
    ciencia_vigente = serializers.BooleanField()
    alerta_ciente_em = serializers.DateTimeField(allow_null=True)
    alerta_ciente_por_nome = serializers.CharField(allow_null=True)
    alerta_ciente_motivo = serializers.ChoiceField(choices=MotivoCiencia.choices, allow_null=True)
    alerta_ciente_observacao = serializers.CharField(allow_null=True)


class SetorAcompanhadoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()
    organiza = serializers.BooleanField(help_text='Se a pessoa pode distribuir no setor.')
    na_fila = serializers.IntegerField()
    em_andamento = serializers.IntegerField(help_text='Distribuídos ou em execução.')
    atrasados = serializers.IntegerField()
    em_alerta = serializers.IntegerField(help_text='Sem movimentação há N dias, sem ciência vigente.')
    sem_prazo = serializers.IntegerField(help_text='Distribuídos ou em execução sem prazo.')


class OutroServicoDaOSSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    setor_nome = serializers.CharField(allow_null=True)
    etapa = serializers.ChoiceField(choices=ETAPAS)
    responsaveis = serializers.ListField(child=serializers.CharField())


class ItemDaFilaSerializer(ContextoDaOSMixin):
    servico_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)
    na_fila_ha_dias = serializers.IntegerField()
    em_alerta = serializers.BooleanField()
    outros_servicos_da_os = OutroServicoDaOSSerializer(many=True)


class TarefaDistribuidaSerializer(serializers.Serializer):
    responsavel = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.filter(is_active=True))
    prazo = serializers.DateField(required=False, allow_null=True)
    descricao = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    prioridade = serializers.ChoiceField(choices=Prioridade.choices, required=False)


class DistribuirSerializer(serializers.Serializer):
    tarefas = TarefaDistribuidaSerializer(
        many=True, allow_empty=False,
        help_text='Uma tarefa distribui o serviço para uma pessoa; várias dividem o serviço entre pessoas.',
    )


class CienciaSerializer(serializers.Serializer):
    motivo = serializers.ChoiceField(choices=MotivoCiencia.choices, required=False, allow_null=True)
    observacao = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class LinhaDeTarefaSerializer(serializers.Serializer):
    tarefa_id = serializers.IntegerField()
    status = serializers.CharField()
    descricao = serializers.CharField(allow_null=True)
    responsavel_id = serializers.IntegerField()
    responsavel_nome = serializers.CharField(allow_null=True)
    servico_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    setor_nome = serializers.CharField(allow_null=True)
    cliente_nome = serializers.CharField()
    ordem_servico_id = serializers.IntegerField()
    prazo = serializers.DateField(allow_null=True)
    situacao_prazo = serializers.ChoiceField(choices=SITUACOES_PRAZO)
    idade_dias = serializers.IntegerField(help_text='Dias desde a criação da tarefa.')
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)
    servico_em_alerta = serializers.BooleanField()
    servico_dias_sem_movimentacao = serializers.IntegerField()


class AlertaSerializer(ContextoDaOSMixin, CienciaMixin):
    servico_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    etapa = serializers.ChoiceField(choices=ETAPAS)
    prazo = serializers.DateField(allow_null=True)
    motivos = serializers.ListField(child=serializers.ChoiceField(choices=['atrasado', 'sem_movimentacao']))
    dias_sem_movimentacao = serializers.IntegerField()
    responsaveis = serializers.ListField(child=serializers.CharField())


class ServicoConcluidoSerializer(ContextoDaOSMixin):
    servico_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    terminado_por_nome = serializers.CharField(allow_null=True)
    prazo = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField()
    no_prazo = serializers.BooleanField(allow_null=True, help_text='Vazio quando não havia prazo.')


class ConcluidosSerializer(serializers.Serializer):
    de = serializers.DateField()
    ate = serializers.DateField()
    servicos = ServicoConcluidoSerializer(many=True)


class MembroDaEquipeSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    nome = serializers.CharField(allow_null=True)
    funcao = serializers.CharField(allow_null=True)
    membro_do_setor = serializers.BooleanField(help_text='Falso para quem tem tarefa ativa no setor sem ser membro.')
    ativos = serializers.IntegerField()
    atrasados = serializers.IntegerField()
    vence_7_dias = serializers.IntegerField()
    sem_prazo = serializers.IntegerField()
    em_alerta = serializers.IntegerField()
    mais_antigo_dias = serializers.IntegerField(allow_null=True)


class TarefaDoDetalheSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    responsavel_id = serializers.IntegerField()
    responsavel_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    prazo = serializers.DateField(allow_null=True)
    situacao_prazo = serializers.ChoiceField(choices=SITUACOES_PRAZO, allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)


class ContextoDaOSDetalheSerializer(ContextoDaOSMixin):
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)
    observacao = serializers.CharField(allow_null=True)


class DetalheDoServicoSerializer(CienciaMixin):
    id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    setor_id = serializers.IntegerField(allow_null=True)
    setor_nome = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    etapa = serializers.ChoiceField(choices=ETAPAS)
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)
    prazo = serializers.DateField(allow_null=True)
    situacao_prazo = serializers.ChoiceField(choices=SITUACOES_PRAZO, allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)
    terminado_por_nome = serializers.CharField(allow_null=True)
    criado_em = serializers.DateTimeField()
    ultima_movimentacao_em = serializers.DateTimeField()
    dias_sem_movimentacao = serializers.IntegerField()
    em_alerta = serializers.BooleanField()
    tarefas = TarefaDoDetalheSerializer(many=True)
    ordem_servico = ContextoDaOSDetalheSerializer()
    outros_servicos_da_os = OutroServicoDaOSSerializer(many=True)
    pode_distribuir = serializers.BooleanField()
    pode_dar_ciencia = serializers.BooleanField()
