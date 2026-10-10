from rest_framework import serializers

from .shared import MesDecimalSerializer


class ClienteCobrancaSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    total_valor_cobrado = serializers.DecimalField(max_digits=14, decimal_places=2)


class ClienteVendasSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    total_valor_vendas = serializers.DecimalField(max_digits=14, decimal_places=2)


class ClientesAnaliseSerializer(serializers.Serializer):
    mais_cobranca = ClienteCobrancaSerializer(many=True)
    mais_vendas = ClienteVendasSerializer(many=True)


class SomasPorSituacaoSerializer(serializers.Serializer):
    a_faturar = serializers.DecimalField(max_digits=14, decimal_places=2)
    faturadas = serializers.DecimalField(max_digits=14, decimal_places=2)
    previsao = serializers.DecimalField(max_digits=14, decimal_places=2)


class PorTipoCondicaoSerializer(serializers.Serializer):
    a_vista = SomasPorSituacaoSerializer()
    parcelado = SomasPorSituacaoSerializer()
    recorrente = SomasPorSituacaoSerializer()


class FinanceiroAnaliseResponseSerializer(serializers.Serializer):
    total_cobrado = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_para_cobrar = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_sem_liberacao = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_previsao = serializers.DecimalField(
        max_digits=14, decimal_places=2, help_text='Não liberadas e não faturadas, sem as OS canceladas.',
    )
    por_tipo_condicao = PorTipoCondicaoSerializer(help_text='A faturar, faturado e previsão por tipo de condição.')
    receita_recorrente_mensal = serializers.DecimalField(
        max_digits=14, decimal_places=2, help_text='Soma do valor mensal dos recorrentes não cancelados.',
    )
    recorrentes_ativos = serializers.IntegerField()
    ticket_medio = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    vendas_por_mes = MesDecimalSerializer(many=True)
    clientes = ClientesAnaliseSerializer()
