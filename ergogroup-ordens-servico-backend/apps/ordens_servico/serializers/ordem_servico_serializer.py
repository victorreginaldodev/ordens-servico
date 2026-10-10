from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.ordens_servico.models import OrdemServico
from apps.ordens_servico.models.ordem_servico import validar_condicao_pagamento
from apps.ordens_servico.serializers.servico_serializer import ServicoDaVendaSerializer
from apps.ordens_servico.services import comercial
from apps.ordens_servico.services.venda import registrar_venda
from apps.clientes.models import Cliente
from apps.clientes.serializers import ClienteListSerializer, ClienteSerializer
from apps.organizacoes.permissoes import Permissao, tem_permissao

CAMPOS_FINANCEIROS = (
    'valor', 'valor_mensal', 'tipo_condicao', 'tipo_condicao_display', 'forma_pagamento', 'forma_pagamento_display',
    'quantidade_parcelas', 'data_acordada_cobranca', 'intervalo_parcelas_dias', 'dia_fechamento',
    'dia_vencimento', 'liberar_em', 'liberar_em_display', 'condicao_resumo',
)


class OcultaValoresMixin:
    """Sem `financeiro.ver_valores`, valor e condições de pagamento não aparecem na resposta e
    são ignorados na edição. Na criação eles continuam aceitos, porque quem lança a venda informa o valor."""

    def pode_ver_valores(self):
        request = self.context.get('request')
        return request is None or tem_permissao(request.user, Permissao.FINANCEIRO_VER_VALORES)

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None and not self.pode_ver_valores():
            for nome in CAMPOS_FINANCEIROS:
                if nome in fields:
                    fields[nome].read_only = True
        return fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.pode_ver_valores():
            for nome in CAMPOS_FINANCEIROS:
                data.pop(nome, None)
        return data


class AndamentoSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    na_fila = serializers.IntegerField()
    distribuido = serializers.IntegerField()
    em_execucao = serializers.IntegerField()
    concluido = serializers.IntegerField()
    cancelado = serializers.IntegerField()


class OrdemServicoListSerializer(OcultaValoresMixin, serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    vendido_por_nome = serializers.CharField(source='criado_por.nome_completo', read_only=True, default=None)
    condicao_resumo = serializers.CharField(read_only=True)
    andamento = serializers.SerializerMethodField()
    tipo_condicao_display = serializers.CharField(source='get_tipo_condicao_display', read_only=True)
    liberar_em_display = serializers.CharField(source='get_liberar_em_display', read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    liberada_para_cobranca_por_nome = serializers.SerializerMethodField()
    dias_em_aberto = serializers.IntegerField(read_only=True, allow_null=True)
    dias_entre_criacao_e_conclusao = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'cliente', 'cliente_nome', 'data_venda', 'vendido_por_nome', 'valor', 'valor_mensal',
            'tipo_condicao', 'tipo_condicao_display', 'condicao_resumo', 'forma_pagamento', 'forma_pagamento_display',
            'liberar_em', 'liberar_em_display', 'andamento', 'status',
            'status_display', 'prioridade', 'prioridade_display', 'prazo',
            'concluida', 'cobranca_realizada', 'referencia_lancamento',
            'liberada_para_cobranca', 'liberada_para_cobranca_em',
            'liberada_para_cobranca_por_nome', 'dias_em_aberto',
            'dias_entre_criacao_e_conclusao',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_liberada_para_cobranca_por_nome(self, obj):
        if not obj.liberada_para_cobranca_por:
            return None
        usuario = obj.liberada_para_cobranca_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    @extend_schema_field(AndamentoSerializer)
    def get_andamento(self, obj):
        """Quantos serviços da OS estão em cada etapa da execução (ex.: "2 de 4 concluídos")."""
        return comercial.andamento(obj)


class OrdemServicoSerializer(OcultaValoresMixin, serializers.ModelSerializer):
    cliente_detail = ClienteSerializer(source='cliente', read_only=True)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    tipo_condicao_display = serializers.CharField(source='get_tipo_condicao_display', read_only=True)
    liberar_em_display = serializers.CharField(source='get_liberar_em_display', read_only=True)
    condicao_resumo = serializers.CharField(read_only=True)
    origem_lancamento_display = serializers.CharField(source='get_origem_lancamento_display', read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    criado_por_nome = serializers.SerializerMethodField()
    liberada_para_cobranca_por_nome = serializers.SerializerMethodField()
    cobranca_realizada_por_nome = serializers.SerializerMethodField()
    data_conclusao_os = serializers.SerializerMethodField()
    finalizador_nome = serializers.SerializerMethodField()
    dias_em_aberto = serializers.IntegerField(read_only=True, allow_null=True)
    dias_entre_criacao_e_conclusao = serializers.IntegerField(read_only=True, allow_null=True)
    servicos = ServicoDaVendaSerializer(
        many=True, required=False,
        help_text='Serviços vendidos, enviados junto na criação da OS. Na edição é somente leitura: '
                  'use /servicos/ para acrescentar ou alterar serviços.',
    )

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'cliente', 'cliente_detail', 'servicos',
            'criado_por', 'criado_por_nome', 'data_venda', 'criada_em',
            'status', 'status_display', 'prioridade', 'prioridade_display', 'prazo', 'valor',
            'valor_mensal', 'tipo_condicao', 'tipo_condicao_display', 'condicao_resumo',
            'forma_pagamento', 'forma_pagamento_display', 'quantidade_parcelas',
            'data_acordada_cobranca', 'intervalo_parcelas_dias', 'dia_fechamento', 'dia_vencimento',
            'liberar_em', 'liberar_em_display', 'nome_contato_envio_nf', 'contato_envio_nf',
            'observacao', 'concluida', 'cobranca_realizada', 'referencia_lancamento',
            'origem_lancamento', 'origem_lancamento_display', 'data_cobranca',
            'cobranca_realizada_por', 'cobranca_realizada_por_nome',
            'liberada_para_cobranca', 'liberada_para_cobranca_em',
            'liberada_para_cobranca_por', 'liberada_para_cobranca_por_nome',
            'data_atualizacao', 'atualizado_por',
            'data_conclusao_os', 'finalizador_nome',
            'dias_em_aberto', 'dias_entre_criacao_e_conclusao',
        ]
        read_only_fields = [
            'status', 'concluida', 'criada_em', 'data_atualizacao',
            'criado_por', 'atualizado_por', 'liberada_para_cobranca',
            'liberada_para_cobranca_em', 'liberada_para_cobranca_por',
            # Cobrança só é registrada pelo endpoint dedicado, que valida a liberação.
            'cobranca_realizada', 'referencia_lancamento', 'origem_lancamento', 'data_cobranca',
            'cobranca_realizada_por', 'dias_em_aberto', 'dias_entre_criacao_e_conclusao',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        def atual(campo):
            return attrs.get(campo, getattr(self.instance, campo, None))

        erros = validar_condicao_pagamento(
            atual('tipo_condicao'), atual('quantidade_parcelas'), atual('data_acordada_cobranca'),
            atual('dia_vencimento'), atual('valor_mensal'),
        )
        if erros:
            raise serializers.ValidationError(erros)
        return attrs

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_criado_por_nome(self, obj):
        if not obj.criado_por:
            return None
        return obj.criado_por.nome_completo or obj.criado_por.get_full_name() or obj.criado_por.username

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_liberada_para_cobranca_por_nome(self, obj):
        if not obj.liberada_para_cobranca_por:
            return None
        usuario = obj.liberada_para_cobranca_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_cobranca_realizada_por_nome(self, obj):
        if not obj.cobranca_realizada_por:
            return None
        usuario = obj.cobranca_realizada_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_data_conclusao_os(self, obj):
        ultimo_servico = obj.servicos.filter(status='concluida').order_by('-data_termino', '-data_conclusao', '-id').first()
        if not ultimo_servico:
            return None
        data_conclusao = ultimo_servico.data_termino or ultimo_servico.data_conclusao
        return str(data_conclusao) if data_conclusao else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_finalizador_nome(self, obj):
        if obj.liberada_para_cobranca_por:
            usuario = obj.liberada_para_cobranca_por
            return usuario.nome_completo or usuario.get_full_name() or usuario.username
        ultimo_servico = obj.servicos.filter(status='concluida').order_by('-data_termino', '-data_conclusao', '-id').first()
        if not ultimo_servico or not ultimo_servico.terminado_por:
            return None
        usuario = ultimo_servico.terminado_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            fields['servicos'].read_only = True
        return fields

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['criado_por'] = request.user
        servicos = validated_data.pop('servicos', [])
        return registrar_venda(validated_data, servicos)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['atualizado_por'] = request.user
        return super().update(instance, validated_data)


class RegistrarCobrancaRequestSerializer(serializers.Serializer):
    referencia_lancamento = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True,
        help_text='Referência do lançamento no sistema financeiro externo (número da NF ou código).',
    )
    data_cobranca = serializers.DateField(required=False, allow_null=True)


class LiberadaCobrancaSerializer(serializers.Serializer):
    liberada = serializers.BooleanField()
    liberada_em = serializers.DateTimeField(allow_null=True)
    liberada_por = serializers.IntegerField(allow_null=True)
