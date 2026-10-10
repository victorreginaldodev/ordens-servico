from rest_framework import serializers

from .shared import MesSerializer


class ServicoPorStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    status_display = serializers.CharField()
    total = serializers.IntegerField()


class ServicoPrincipalSerializer(serializers.Serializer):
    catalogo_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField()
    total = serializers.IntegerField()
    percentual = serializers.FloatField(allow_null=True)


class OrdensServicoAnaliseSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    total_concluidas = serializers.IntegerField()
    total_nao_concluidas = serializers.IntegerField()
    abertas_por_mes = MesSerializer(many=True)
    concluidas_por_mes = MesSerializer(many=True)
    abertas_mes_atual = serializers.IntegerField()
    abertas_mes_anterior = serializers.IntegerField()
    concluidas_mes_atual = serializers.IntegerField()
    concluidas_mes_anterior = serializers.IntegerField()
    em_aberto = serializers.IntegerField()


class ServicoAnaliseSerializer(serializers.Serializer):
    concluidos_ultimos_12_meses_total = serializers.IntegerField()
    concluidos_por_mes = MesSerializer(many=True)
    principais_por_quantidade = ServicoPrincipalSerializer(many=True)
    por_status = ServicoPorStatusSerializer(many=True)


class TarefaPorStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    status_display = serializers.CharField()
    total = serializers.IntegerField()


class TarefaAnaliseSerializer(serializers.Serializer):
    por_status = TarefaPorStatusSerializer(many=True)
    concluidas_por_mes = MesSerializer(many=True)


class RevisaoPorClienteSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    total = serializers.IntegerField()
    percentual = serializers.FloatField(allow_null=True)


class MiniOSAnaliseSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    total_revisao_cliente = serializers.IntegerField()
    criadas_por_mes = MesSerializer(many=True)
    finalizadas_por_mes = MesSerializer(many=True)
    criadas_mes_atual = serializers.IntegerField()
    criadas_mes_anterior = serializers.IntegerField()
    finalizadas_mes_atual = serializers.IntegerField()
    finalizadas_mes_anterior = serializers.IntegerField()
    revisoes_por_cliente = RevisaoPorClienteSerializer(many=True)


class DistribuicaoTempoOSSerializer(serializers.Serializer):
    ate_7 = serializers.IntegerField()
    de_8_a_15 = serializers.IntegerField()
    de_16_a_30 = serializers.IntegerField()
    de_31_a_60 = serializers.IntegerField()
    acima_60 = serializers.IntegerField()


class TempoPorCatalogoSerializer(serializers.Serializer):
    """Reutilizado tanto para Serviço/Catálogo quanto para OSO/CatalogoOperacional."""
    catalogo_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField()
    # Só o catálogo operacional tem horas e complexidade; para o catálogo de serviços vêm nulos.
    horas_estimadas = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    complexidade = serializers.IntegerField(allow_null=True)
    total_concluidos = serializers.IntegerField()
    media_dias = serializers.FloatField()


class TemposMediosSerializer(serializers.Serializer):
    os_criacao_para_encerramento_dias = serializers.FloatField(allow_null=True)
    os_criacao_para_conclusao_dias = serializers.FloatField(allow_null=True)
    os_total_com_data = serializers.IntegerField()
    os_distribuicao_tempo = DistribuicaoTempoOSSerializer()
    servicos_inicio_para_fim_dias = serializers.FloatField(allow_null=True)
    tarefa_criacao_para_inicio_dias = serializers.FloatField(allow_null=True)
    tempo_por_catalogo_servico = TempoPorCatalogoSerializer(many=True)
    tempo_por_catalogo_oso = TempoPorCatalogoSerializer(many=True)


class BlocoCancelamentoSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    canceladas = serializers.IntegerField()
    percentual = serializers.FloatField(allow_null=True)


class CancelamentoPorCatalogoSerializer(serializers.Serializer):
    catalogo_id = serializers.IntegerField()
    catalogo_nome = serializers.CharField()
    total = serializers.IntegerField()
    canceladas = serializers.IntegerField()
    percentual = serializers.FloatField(allow_null=True)


class TaxaCancelamentoSerializer(serializers.Serializer):
    tarefas = BlocoCancelamentoSerializer()
    servicos = BlocoCancelamentoSerializer()
    por_catalogo = CancelamentoPorCatalogoSerializer(many=True)


class BlocoCumprimentoPrazoSerializer(serializers.Serializer):
    total_com_prazo = serializers.IntegerField()
    no_prazo = serializers.IntegerField()
    percentual = serializers.FloatField(allow_null=True)


class TaxaCumprimentoPrazoSerializer(serializers.Serializer):
    tarefas = BlocoCumprimentoPrazoSerializer()
    minios = BlocoCumprimentoPrazoSerializer()


class TecnicoProdutividadeSerializer(serializers.Serializer):
    tecnico_id = serializers.IntegerField()
    tecnico_nome = serializers.CharField(allow_null=True)
    tarefas_concluidas = serializers.IntegerField()
    tempo_medio_tarefa_dias = serializers.FloatField(allow_null=True)
    mini_os_concluidas = serializers.IntegerField()
    tarefas_em_aberto = serializers.IntegerField()
    mini_os_em_aberto = serializers.IntegerField()
    tarefas_atrasadas = serializers.IntegerField()
    mini_os_atrasadas = serializers.IntegerField()
    tarefas_alta_prioridade_abertas = serializers.IntegerField()
    mini_os_alta_prioridade_abertas = serializers.IntegerField()
    tarefas_concluidas_por_mes = MesSerializer(many=True)
    mini_os_concluidas_por_mes = MesSerializer(many=True)
    taxa_cumprimento_prazo_tarefas = serializers.FloatField(allow_null=True)
    taxa_cumprimento_prazo_minios = serializers.FloatField(allow_null=True)


class OperacionalAnaliseResponseSerializer(serializers.Serializer):
    ordens_servico = OrdensServicoAnaliseSerializer()
    servicos = ServicoAnaliseSerializer()
    tarefas = TarefaAnaliseSerializer()
    minios = MiniOSAnaliseSerializer()
    tempos_medios = TemposMediosSerializer()
    taxa_cancelamento = TaxaCancelamentoSerializer()
    taxa_cumprimento_prazo = TaxaCumprimentoPrazoSerializer()
    por_tecnico = TecnicoProdutividadeSerializer(many=True)
