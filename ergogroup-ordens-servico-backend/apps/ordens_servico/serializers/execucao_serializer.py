"""Formato das respostas dos blocos da execução (fase 8). Os dados vêm prontos de `services/execucao.py`;
estes serializers só os apresentam e documentam o contrato da API."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.ordens_servico.models import Prioridade
from apps.ordens_servico.models.servico import MotivoCiencia

ETAPAS = ['novo', 'a_distribuir', 'distribuido', 'em_execucao', 'concluido', 'cancelado']
ETAPAS_TAREFA = ['nova', 'a_iniciar', 'em_andamento', 'concluida', 'cancelada']
ETAPAS_ATIVAS_TAREFA = ['nova', 'a_iniciar', 'em_andamento']
ETAPAS_DA_FILA = ['novo', 'a_distribuir']
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
    ciencia_ate = serializers.DateField(allow_null=True, help_text='Até quando a pausa explicada silencia o aviso.')


class RecebimentoMixin(serializers.Serializer):
    recebido_em = serializers.DateTimeField(allow_null=True, help_text='Ciência de recebimento do setor (ADR 0009).')
    recebido_por_nome = serializers.CharField(allow_null=True)


class SetorAcompanhadoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()
    organiza = serializers.BooleanField(help_text='Se a pessoa pode distribuir no setor.')
    novos = serializers.IntegerField(help_text='Chegaram e ninguém do setor deu ciência.')
    a_distribuir = serializers.IntegerField(help_text='O setor deu ciência e falta distribuir.')
    em_andamento = serializers.IntegerField(help_text='Distribuídos ou em execução.')
    atrasados = serializers.IntegerField()
    em_alerta = serializers.IntegerField(help_text='Sem movimentação há N dias, sem ciência vigente.')
    sem_prazo = serializers.IntegerField(help_text='Distribuídos ou em execução sem prazo.')
    tarefas_sem_ciencia = serializers.IntegerField(help_text='Tarefas ativas do setor sem ciência do responsável.')


class OutroServicoDaOSSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    setor_nome = serializers.CharField(allow_null=True)
    etapa = serializers.ChoiceField(choices=ETAPAS)
    responsaveis = serializers.ListField(child=serializers.CharField())


class ItemDaFilaSerializer(ContextoDaOSMixin, RecebimentoMixin):
    servico_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)
    etapa = serializers.ChoiceField(choices=ETAPAS_DA_FILA)
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
    """Explicar a pausa (ADR 0008, 3; revisão de 14/10/2026): o motivo é obrigatório, e "outro" exige a observação."""
    motivo = serializers.ChoiceField(choices=MotivoCiencia.choices)
    observacao = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        if attrs['motivo'] == MotivoCiencia.OUTRO and not (attrs.get('observacao') or '').strip():
            raise serializers.ValidationError({'observacao': 'Conte o que o serviço está esperando.'})
        return attrs


class LinhaDeTarefaSerializer(serializers.Serializer):
    tarefa_id = serializers.IntegerField()
    status = serializers.CharField()
    etapa = serializers.ChoiceField(choices=ETAPAS_TAREFA)
    recebida_em = serializers.DateTimeField(allow_null=True, help_text='Ciência de recebimento do responsável.')
    descricao = serializers.CharField(allow_null=True)
    responsavel_id = serializers.IntegerField()
    responsavel_nome = serializers.CharField(allow_null=True)
    servico_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    servico_descricao = serializers.CharField(help_text='O que será feito no serviço (a `descricao` é a da tarefa).')
    setor_nome = serializers.CharField(allow_null=True)
    cliente_nome = serializers.CharField()
    ordem_servico_id = serializers.IntegerField()
    prazo = serializers.DateField(allow_null=True)
    situacao_prazo = serializers.ChoiceField(choices=SITUACOES_PRAZO)
    idade_dias = serializers.IntegerField(help_text='Dias desde a criação da tarefa.')
    atribuida_ha_dias = serializers.IntegerField(
        help_text='Dias desde que a tarefa chegou ao responsável atual (criação ou última troca de responsável).',
    )
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)
    servico_em_alerta = serializers.BooleanField()
    servico_dias_sem_movimentacao = serializers.IntegerField()
    servico_ciencia_vigente = serializers.BooleanField(help_text='A pausa do serviço está explicada e o aviso, silenciado.')
    servico_ciencia_motivo = serializers.ChoiceField(choices=MotivoCiencia.choices, allow_null=True)
    servico_ciencia_observacao = serializers.CharField(allow_null=True)
    servico_ciencia_ate = serializers.DateField(allow_null=True)


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
    membro_do_setor = serializers.BooleanField(help_text='A pessoa é lotada neste setor.')
    recebe_tarefas = serializers.BooleanField(
        help_text='Pode ser responsável por tarefas do setor (lotada com "Recebe tarefas" ou "também executa" aqui). '
                  'Falso para quem só aparece por ter tarefa ativa no setor.',
    )
    setor_de_origem_nome = serializers.CharField(
        allow_null=True, help_text='Setor da pessoa, quando ela é de outro setor e "também executa" neste.',
    )
    ativos = serializers.IntegerField()
    atrasados = serializers.IntegerField()
    vence_7_dias = serializers.IntegerField()
    sem_prazo = serializers.IntegerField()
    em_alerta = serializers.IntegerField()
    mais_antigo_dias = serializers.IntegerField(allow_null=True)
    sem_ciencia = serializers.IntegerField(help_text='Tarefas ativas da pessoa sem ciência dela.')
    sem_ciencia_mais_antiga_dias = serializers.IntegerField(
        allow_null=True, help_text='Dias desde a atribuição da tarefa sem ciência mais antiga.',
    )


class TarefaDoDetalheSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    responsavel_id = serializers.IntegerField()
    responsavel_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    etapa = serializers.ChoiceField(choices=ETAPAS_TAREFA)
    recebida_em = serializers.DateTimeField(allow_null=True)
    pode_confirmar_recebimento = serializers.BooleanField(help_text='Só para o responsável, com a tarefa nova.')
    prazo = serializers.DateField(allow_null=True)
    situacao_prazo = serializers.ChoiceField(choices=SITUACOES_PRAZO, allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)


class ContextoDaOSDetalheSerializer(ContextoDaOSMixin):
    """Sem a observação da OS: ela é de pagamento e faturamento e fica só com quem vê valores."""
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)


class DetalheDoServicoSerializer(CienciaMixin, RecebimentoMixin):
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
    pode_confirmar_recebimento = serializers.BooleanField(
        help_text='Serviço aberto, sem ciência de recebimento, e a pessoa distribui no setor.',
    )


class ReceberServicosSerializer(serializers.Serializer):
    servicos = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class ServicosRecebidosSerializer(serializers.Serializer):
    recebidos = serializers.ListField(child=serializers.IntegerField())
    ja_recebidos = serializers.ListField(child=serializers.IntegerField(), help_text='Já tinham ciência.')


class ReceberTarefasSerializer(serializers.Serializer):
    tarefas = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class TarefasRecebidasSerializer(serializers.Serializer):
    recebidas = serializers.ListField(child=serializers.IntegerField())
    ja_recebidas = serializers.ListField(child=serializers.IntegerField(), help_text='Já tinham ciência.')


class ContadoresMeusServicosSerializer(serializers.Serializer):
    nova = serializers.IntegerField()
    a_iniciar = serializers.IntegerField()
    em_andamento = serializers.IntegerField()
