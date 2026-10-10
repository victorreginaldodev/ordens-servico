from rest_framework import serializers

TIPOS_DE_EVENTO = [
    'historico_anterior', 'venda', 'venda_alterada', 'condicao_alterada', 'chegada', 'distribuicao',
    'reatribuicao', 'prazo_alterado', 'tarefa_iniciada', 'tarefa_concluida', 'tarefa_cancelada', 'tarefa_reaberta',
    'tarefa_excluida', 'ciencia', 'servico_concluido', 'servico_cancelado', 'servico_reaberto', 'servico_excluido',
    'os_concluida', 'os_cancelada', 'os_reaberta', 'liberacao', 'lancamento',
]


class EventoDaLinhaDoTempoSerializer(serializers.Serializer):
    quando = serializers.DateTimeField()
    quem = serializers.CharField(allow_null=True, help_text='Quem fez a ação; vazio quando foi o sistema.')
    tipo = serializers.ChoiceField(choices=TIPOS_DE_EVENTO)
    texto = serializers.CharField()
    ordem_servico_id = serializers.IntegerField(allow_null=True)
    servico_id = serializers.IntegerField(allow_null=True)
    tarefa_id = serializers.IntegerField(allow_null=True)
