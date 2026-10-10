"""Formato das respostas do financeiro (fase 10). Os dados vêm prontos de `services/financeiro.py`."""
from rest_framework import serializers

from apps.ordens_servico.models import FormaPagamento, LiberarEm, OrigemLancamento, TipoCondicao
from apps.ordens_servico.serializers.execucao_serializer import ETAPAS
from apps.ordens_servico.serializers.ordem_servico_serializer import AndamentoSerializer
from apps.ordens_servico.services.financeiro import SITUACOES


class LinhaDeCobrancaSerializer(serializers.Serializer):
    ordem_servico_id = serializers.IntegerField()
    situacao = serializers.ChoiceField(choices=SITUACOES, allow_null=True)
    status = serializers.CharField(help_text='Status da OS.')
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    data_venda = serializers.DateField()
    vendido_por_nome = serializers.CharField(allow_null=True)
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_mensal = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    tipo_condicao = serializers.ChoiceField(choices=TipoCondicao.choices)
    condicao_resumo = serializers.CharField()
    forma_pagamento = serializers.ChoiceField(choices=FormaPagamento.choices)
    quantidade_parcelas = serializers.IntegerField(allow_null=True)
    data_acordada_cobranca = serializers.DateField(allow_null=True, help_text='Primeiro vencimento.')
    nome_contato_envio_nf = serializers.CharField(allow_blank=True)
    contato_envio_nf = serializers.CharField(allow_blank=True)
    liberar_em = serializers.ChoiceField(choices=LiberarEm.choices)
    liberada_para_cobranca_em = serializers.DateTimeField(allow_null=True)
    liberada_para_cobranca_por_nome = serializers.CharField(allow_null=True)
    referencia_lancamento = serializers.CharField(allow_null=True)
    origem_lancamento = serializers.ChoiceField(choices=OrigemLancamento.choices, allow_null=True)
    data_cobranca = serializers.DateField(allow_null=True, help_text='Data do lançamento.')
    cobranca_realizada_por_nome = serializers.CharField(allow_null=True)
    dias_aguardando_lancamento = serializers.IntegerField(allow_null=True, help_text='Só nas OS a faturar.')
    em_alerta = serializers.BooleanField(help_text='Liberada há `DIAS_ALERTA_SEM_LANCAMENTO` dias sem lançamento.')
    andamento = AndamentoSerializer()


class ContadorSerializer(serializers.Serializer):
    quantidade = serializers.IntegerField()
    valor = serializers.DecimalField(max_digits=14, decimal_places=2)


class ContadoresSerializer(serializers.Serializer):
    a_faturar = ContadorSerializer()
    faturadas = ContadorSerializer()
    previsao = ContadorSerializer()


class CobrancasSerializer(serializers.Serializer):
    situacao = serializers.ChoiceField(choices=SITUACOES)
    contadores = ContadoresSerializer(help_text='As três situações, sob os mesmos filtros.')
    em_alerta = serializers.IntegerField(help_text='Quantas OS a faturar estão em alerta.')
    ordens = LinhaDeCobrancaSerializer(many=True)


class ServicoDaSituacaoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    descricao = serializers.CharField()
    etapa = serializers.ChoiceField(choices=ETAPAS)
    data_termino = serializers.DateField(allow_null=True)


class EventoFinanceiroSerializer(serializers.Serializer):
    quando = serializers.CharField(allow_null=True, help_text='Data e hora (ISO 8601); o lançamento só tem data.')
    quem = serializers.CharField(allow_null=True)
    tipo = serializers.ChoiceField(choices=['venda', 'liberacao', 'lancamento'])
    texto = serializers.CharField()


class SituacaoFinanceiraSerializer(LinhaDeCobrancaSerializer):
    observacao = serializers.CharField(allow_null=True)
    servicos = ServicoDaSituacaoSerializer(many=True)
    eventos = EventoFinanceiroSerializer(many=True)
