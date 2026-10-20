"""Formato das respostas do financeiro (fase 10). Os dados vêm prontos de `services/financeiro.py`."""
from rest_framework import serializers

from apps.ordens_servico.models import FormaPagamento, LiberarEm, OrigemLancamento, TipoCondicao
from apps.ordens_servico.models.ordem_servico_operacional import RegraDeCobranca
from apps.ordens_servico.serializers.execucao_serializer import ETAPAS
from apps.ordens_servico.serializers.linha_do_tempo_serializer import EventoDaLinhaDoTempoSerializer
from apps.ordens_servico.serializers.ordem_servico_serializer import AndamentoSerializer
from apps.ordens_servico.serializers.comercial_serializer import ResponsavelDoServicoSerializer
from apps.ordens_servico.services.conferencia import CODIGOS as CODIGOS_DA_CONFERENCIA
from apps.ordens_servico.services.conferencia import TIPOS_DE_VERIFICACAO
from apps.ordens_servico.services.financeiro import CATEGORIAS_DE_EVENTO, SITUACOES, SITUACOES_DA_LISTA


class ServicoPendenteSerializer(serializers.Serializer):
    servico_id = serializers.IntegerField()
    servico_nome = serializers.CharField(help_text='Nome do catálogo (ou a descrição, sem catálogo).')
    setor_nome = serializers.CharField(allow_null=True)
    etapa = serializers.ChoiceField(choices=ETAPAS)
    responsaveis = serializers.ListField(child=serializers.CharField(), help_text='Quem está com as tarefas abertas.')
    dias_sem_movimentacao = serializers.IntegerField(allow_null=True)


class LinhaDeCobrancaSerializer(serializers.Serializer):
    ordem_servico_id = serializers.IntegerField()
    situacao = serializers.ChoiceField(choices=SITUACOES, allow_null=True)
    status = serializers.CharField(help_text='Status da OS.')
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    data_venda = serializers.DateField()
    vendido_por_nome = serializers.CharField(allow_null=True)
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    tipo_condicao = serializers.ChoiceField(choices=TipoCondicao.choices)
    condicao_resumo = serializers.CharField()
    forma_pagamento = serializers.ChoiceField(choices=FormaPagamento.choices)
    quantidade_parcelas = serializers.IntegerField(allow_null=True)
    data_acordada_cobranca = serializers.DateField(allow_null=True, help_text='Vencimento (no parcelado, a 1ª parcela).')
    vencimento_resumo = serializers.CharField(
        allow_null=True, help_text='Ex.: "10/08/2026" ou "21 dias após a nota"; vazio sem vencimento.',
    )
    vencimento_dias_apos_nota = serializers.IntegerField(
        allow_null=True, help_text='Vencimento em dias após a emissão da nota, no lugar da data.',
    )
    dia_vencimento_demais = serializers.IntegerField(
        allow_null=True, help_text='Parcelado: dia do mês das parcelas da 2ª em diante. Vazio = mesmo dia da 1ª.',
    )
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
    pendentes = ServicoPendenteSerializer(
        many=True, help_text='Na previsão: os serviços que faltam para liberar, o mais parado primeiro.',
    )
    ultima_movimentacao_em = serializers.DateTimeField(allow_null=True, help_text='A mais recente dos serviços.')
    pendencias = serializers.ListField(
        child=serializers.ChoiceField(choices=CODIGOS_DA_CONFERENCIA),
        help_text='Códigos das verificações da conferência em que a OS aparece (faturamento/04).',
    )


class ContadorSerializer(serializers.Serializer):
    quantidade = serializers.IntegerField()
    valor = serializers.DecimalField(max_digits=14, decimal_places=2)


class ContadoresSerializer(serializers.Serializer):
    a_faturar = ContadorSerializer()
    faturadas = ContadorSerializer()
    previsao = ContadorSerializer()


class LinhaDeCobrancaOperacionalSerializer(serializers.Serializer):
    ordem_servico_operacional_id = serializers.IntegerField()
    situacao = serializers.ChoiceField(choices=SITUACOES, allow_null=True)
    status = serializers.CharField(help_text='Status da OS operacional.')
    cliente_id = serializers.IntegerField()
    cliente_nome = serializers.CharField()
    catalogo_operacional_nome = serializers.CharField(help_text='O item do catálogo operacional: o que cobrar.')
    regra_de_cobranca = serializers.ChoiceField(
        choices=RegraDeCobranca.choices,
        help_text='`catalogo`: segue o catálogo; `legado`: anterior à regra do catálogo, cobrança congelada.',
    )
    revisao_cliente = serializers.BooleanField(help_text='Só histórico do sistema anterior.')
    quantidade = serializers.IntegerField()
    descricao = serializers.CharField(allow_null=True)
    responsavel_nome = serializers.CharField(allow_null=True)
    data_recebimento = serializers.DateField(allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)
    prazo = serializers.DateField(allow_null=True)
    liberada_para_cobranca_em = serializers.DateTimeField(allow_null=True)
    liberada_para_cobranca_por_nome = serializers.CharField(allow_null=True)
    referencia_lancamento = serializers.CharField(
        allow_null=True, help_text='Referência do lançamento; nas cobranças antigas, a NF do campo anterior.',
    )
    data_cobranca = serializers.DateField(allow_null=True, help_text='Data do lançamento.')
    cobranca_realizada_por_nome = serializers.CharField(allow_null=True)
    dias_aguardando_lancamento = serializers.IntegerField(allow_null=True, help_text='Só nas OS operacionais a faturar.')
    em_alerta = serializers.BooleanField()
    dias_sem_movimentacao = serializers.IntegerField(allow_null=True, help_text='Só na previsão.')
    criada_em = serializers.DateTimeField()
    pendencias = serializers.ListField(child=serializers.ChoiceField(choices=CODIGOS_DA_CONFERENCIA))


class ContadoresOperacionaisSerializer(serializers.Serializer):
    a_faturar = serializers.IntegerField()
    faturadas = serializers.IntegerField()
    previsao = serializers.IntegerField()


class CobrancasSerializer(serializers.Serializer):
    situacao = serializers.ChoiceField(choices=SITUACOES_DA_LISTA)
    contadores = ContadoresSerializer(help_text='As três situações, sob os mesmos filtros.')
    em_alerta = serializers.IntegerField(help_text='Quantas OS a faturar estão em alerta.')
    dias_alerta_sem_lancamento = serializers.IntegerField(help_text='A partir de quantos dias a OS liberada entra em alerta.')
    ordens = LinhaDeCobrancaSerializer(many=True)
    operacionais = LinhaDeCobrancaOperacionalSerializer(
        many=True, help_text='As OS operacionais que geram cobrança, nas mesmas situações (19/10/2026).',
    )
    contadores_operacionais = ContadoresOperacionaisSerializer(help_text='Quantas OS operacionais em cada situação.')
    operacionais_em_alerta = serializers.IntegerField()


class ServicoRealizadoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    catalogo_nome = serializers.CharField(allow_null=True)
    descricao = serializers.CharField()
    setor_nome = serializers.CharField(allow_null=True)
    etapa = serializers.ChoiceField(choices=ETAPAS)
    prazo = serializers.DateField(allow_null=True)
    data_inicio = serializers.DateField(allow_null=True)
    data_termino = serializers.DateField(allow_null=True)
    terminado_por_nome = serializers.CharField(allow_null=True, help_text='Quem finalizou o serviço.')
    responsaveis = ResponsavelDoServicoSerializer(many=True, help_text='Quem executou: uma linha por tarefa.')
    dias_sem_movimentacao = serializers.IntegerField(allow_null=True, help_text='Só nos serviços em aberto.')


class PendenciaDaOrdemSerializer(serializers.Serializer):
    codigo = serializers.ChoiceField(choices=CODIGOS_DA_CONFERENCIA)
    tipo = serializers.ChoiceField(choices=TIPOS_DE_VERIFICACAO)
    titulo = serializers.CharField()
    explicacao = serializers.CharField()
    detalhe = serializers.CharField()
    servico_id = serializers.IntegerField(allow_null=True)


class EventoDoResumoSerializer(EventoDaLinhaDoTempoSerializer):
    categoria = serializers.ChoiceField(choices=CATEGORIAS_DE_EVENTO)


class ClienteDoResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()
    tipo_inscricao = serializers.CharField(allow_null=True, help_text='cnpj, cpf, cei, cno ou caepf.')
    tipo_inscricao_display = serializers.CharField(allow_null=True)
    numero_inscricao = serializers.CharField(allow_null=True)
    tipo_cliente = serializers.CharField(allow_null=True, help_text='gestao, avulso ou fornecedor.')
    tipo_cliente_display = serializers.CharField(allow_null=True)
    nome_representante = serializers.CharField(allow_null=True)
    setor_representante = serializers.CharField(allow_null=True)
    email_representante = serializers.CharField(allow_null=True)
    contato_representante = serializers.CharField(allow_null=True)
    observacao = serializers.CharField(allow_null=True)
    ativo = serializers.BooleanField()


class SituacaoFinanceiraSerializer(LinhaDeCobrancaSerializer):
    observacao = serializers.CharField(allow_null=True)
    cliente = ClienteDoResumoSerializer(help_text='Os dados do cadastro do cliente, para conferir ao faturar.')
    servicos = ServicoRealizadoSerializer(many=True)
    detalhe_pendencias = PendenciaDaOrdemSerializer(many=True)
    eventos = EventoDoResumoSerializer(many=True, help_text='A linha do tempo da OS, do mais recente ao mais antigo.')


class MarcoDaOperacionalSerializer(serializers.Serializer):
    quando = serializers.DateField(allow_null=True)
    tipo = serializers.ChoiceField(choices=['criada', 'iniciada', 'finalizada', 'liberacao', 'lancamento'])
    descricao = serializers.CharField()
    pessoa_nome = serializers.CharField(allow_null=True)


class SituacaoFinanceiraOperacionalSerializer(LinhaDeCobrancaOperacionalSerializer):
    gera_cobranca = serializers.BooleanField(help_text='Se gera cobrança: pela regra do catálogo ou, nas anteriores a ela, a decisão gravada.')
    cliente = ClienteDoResumoSerializer()
    detalhe_pendencias = PendenciaDaOrdemSerializer(many=True)
    historico = MarcoDaOperacionalSerializer(many=True, help_text='Do mais recente ao mais antigo.')


class ItemDaConferenciaSerializer(serializers.Serializer):
    ordem_servico_id = serializers.IntegerField(allow_null=True, help_text='Nulo nos itens de OS operacional.')
    ordem_servico_operacional_id = serializers.IntegerField(allow_null=True, help_text='Só nos itens de OS operacional.')
    cliente_nome = serializers.CharField()
    servico_id = serializers.IntegerField(allow_null=True)
    servico_nome = serializers.CharField(allow_null=True)
    setor_nome = serializers.CharField(allow_null=True)
    responsavel_nome = serializers.CharField(allow_null=True)
    detalhe = serializers.CharField()


class VerificacaoSerializer(serializers.Serializer):
    codigo = serializers.ChoiceField(choices=CODIGOS_DA_CONFERENCIA)
    tipo = serializers.ChoiceField(choices=TIPOS_DE_VERIFICACAO, help_text='Garantia: deve ser sempre 0.')
    situacao = serializers.ChoiceField(choices=SITUACOES, help_text='Situação das OS em que a verificação vale.')
    titulo = serializers.CharField()
    explicacao = serializers.CharField()
    quantidade = serializers.IntegerField()
    itens = ItemDaConferenciaSerializer(many=True)


class ConferenciaSerializer(serializers.Serializer):
    verificado_em = serializers.DateTimeField()
    verificacoes = VerificacaoSerializer(many=True)


class CorrecaoSerializer(serializers.Serializer):
    servicos_corrigidos = serializers.IntegerField()
    ordens_liberadas = serializers.IntegerField()
    operacionais_liberadas = serializers.IntegerField()
