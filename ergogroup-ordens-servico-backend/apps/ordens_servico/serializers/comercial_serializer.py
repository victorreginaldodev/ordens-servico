"""Formato do resumo da venda (fase 9). Os dados vêm prontos de `services/comercial.py`."""
from rest_framework import serializers

from apps.ordens_servico.models import FormaPagamento, LiberarEm, Prioridade, TipoCondicao
from apps.ordens_servico.serializers.execucao_serializer import ETAPAS
from apps.ordens_servico.serializers.ordem_servico_serializer import AndamentoSerializer


class ResponsavelDoServicoSerializer(serializers.Serializer):
    nome = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    prazo = serializers.DateField(allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)


class ServicoDoResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    setor_nome = serializers.CharField(allow_null=True)
    etapa = serializers.ChoiceField(choices=ETAPAS)
    prazo = serializers.DateField(allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)
    terminado_por_nome = serializers.CharField(allow_null=True)
    responsaveis = ResponsavelDoServicoSerializer(many=True)


class CondicoesDaVendaSerializer(serializers.Serializer):
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_mensal = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    tipo_condicao = serializers.ChoiceField(choices=TipoCondicao.choices)
    condicao_resumo = serializers.CharField()
    forma_pagamento = serializers.ChoiceField(choices=FormaPagamento.choices)
    quantidade_parcelas = serializers.IntegerField(allow_null=True)
    data_acordada_cobranca = serializers.DateField(allow_null=True)
    intervalo_parcelas_dias = serializers.IntegerField(allow_null=True)
    dia_fechamento = serializers.IntegerField(allow_null=True)
    dia_vencimento = serializers.IntegerField(allow_null=True)
    liberar_em = serializers.ChoiceField(choices=LiberarEm.choices)
    nome_contato_envio_nf = serializers.CharField(allow_blank=True)
    contato_envio_nf = serializers.CharField(allow_blank=True)


class FinanceiroDaVendaSerializer(serializers.Serializer):
    liberada_para_cobranca = serializers.BooleanField()
    liberada_para_cobranca_em = serializers.DateTimeField(allow_null=True)
    liberada_para_cobranca_por_nome = serializers.CharField(allow_null=True)
    cobranca_realizada = serializers.BooleanField()
    referencia_lancamento = serializers.CharField(allow_null=True)
    data_cobranca = serializers.DateField(allow_null=True)
    cobranca_realizada_por_nome = serializers.CharField(allow_null=True)


class ResumoDaVendaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    data_venda = serializers.DateField()
    vendido_por_nome = serializers.CharField(allow_null=True)
    criada_em = serializers.DateTimeField()
    status = serializers.CharField()
    prioridade = serializers.ChoiceField(choices=Prioridade.choices)
    observacao = serializers.CharField(allow_null=True)
    andamento = AndamentoSerializer()
    servicos = ServicoDoResumoSerializer(many=True)
    condicoes = CondicoesDaVendaSerializer(
        allow_null=True, help_text='Vazio para quem não tem `financeiro.ver_valores`.',
    )
    financeiro = FinanceiroDaVendaSerializer(
        allow_null=True, help_text='Liberação e lançamento. Vazio para quem não tem `financeiro.ver_valores`.',
    )
