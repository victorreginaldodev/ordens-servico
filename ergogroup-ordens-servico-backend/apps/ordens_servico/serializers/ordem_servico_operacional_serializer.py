from rest_framework import serializers
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field

from apps.ordens_servico.models import OrdemServicoOperacional
from apps.catalogo.models import CatalogoOperacional, Complexidade
from apps.clientes.models import Cliente
from apps.clientes.serializers import ClienteListSerializer
from apps.catalogo.serializers import CatalogoOperacionalSerializer

Usuario = get_user_model()


class OrdemServicoOperacionalListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    catalogo_operacional_nome = serializers.CharField(source='catalogo_operacional.nome', read_only=True)
    responsavel_nome = serializers.CharField(source='responsavel.nome_completo', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    complexidade_display = serializers.SerializerMethodField()
    horas_estimadas_efetivas = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True, allow_null=True)
    complexidade_efetiva = serializers.IntegerField(read_only=True, allow_null=True)
    liberada_cobranca_por_nome = serializers.SerializerMethodField()
    cobranca_realizada_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = OrdemServicoOperacional
        fields = [
            'id', 'cliente', 'cliente_nome', 'catalogo_operacional', 'catalogo_operacional_nome',
            'responsavel', 'responsavel_nome', 'status', 'status_display',
            'prioridade', 'prioridade_display', 'prazo',
            'horas_estimadas', 'horas_estimadas_efetivas',
            'complexidade', 'complexidade_display', 'complexidade_efetiva',
            'revisao_cliente', 'gera_cobranca', 'data_liberacao_cobranca',
            'liberada_cobranca_por', 'liberada_cobranca_por_nome',
            'cobranca_realizada', 'numero_nf', 'cobranca_realizada_por', 'cobranca_realizada_por_nome',
            'data_recebimento', 'data_inicio', 'data_termino',
            'criada_em', 'atualizado_em',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_complexidade_display(self, obj):
        if obj.complexidade_efetiva is None:
            return None
        return Complexidade(obj.complexidade_efetiva).label

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_liberada_cobranca_por_nome(self, obj):
        if not obj.liberada_cobranca_por:
            return None
        usuario = obj.liberada_cobranca_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_cobranca_realizada_por_nome(self, obj):
        if not obj.cobranca_realizada_por:
            return None
        usuario = obj.cobranca_realizada_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username


class OrdemServicoOperacionalSerializer(serializers.ModelSerializer):
    cliente_detail = ClienteListSerializer(source='cliente', read_only=True)
    catalogo_operacional_detail = CatalogoOperacionalSerializer(source='catalogo_operacional', read_only=True)
    responsavel_nome = serializers.CharField(source='responsavel.nome_completo', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    complexidade_display = serializers.SerializerMethodField()
    horas_estimadas_efetivas = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True, allow_null=True)
    complexidade_efetiva = serializers.IntegerField(read_only=True, allow_null=True)
    liberada_cobranca_por_nome = serializers.SerializerMethodField()
    cobranca_realizada_por_nome = serializers.SerializerMethodField()

    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    catalogo_operacional = serializers.PrimaryKeyRelatedField(queryset=CatalogoOperacional.objects.all())
    responsavel = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all())

    class Meta:
        model = OrdemServicoOperacional
        fields = [
            'id', 'cliente', 'cliente_detail', 'catalogo_operacional', 'catalogo_operacional_detail',
            'responsavel', 'responsavel_nome', 'quantidade', 'descricao',
            'prioridade', 'prioridade_display', 'prazo',
            'horas_estimadas', 'horas_estimadas_efetivas',
            'complexidade', 'complexidade_display', 'complexidade_efetiva',
            'data_recebimento', 'data_inicio', 'data_termino',
            'status', 'status_display', 'revisao_cliente', 'gera_cobranca',
            'data_liberacao_cobranca', 'liberada_cobranca_por',
            'liberada_cobranca_por_nome', 'cobranca_realizada', 'numero_nf',
            'cobranca_realizada_por', 'cobranca_realizada_por_nome',
            'criada_em', 'atualizado_em',
        ]
        read_only_fields = [
            'criada_em', 'atualizado_em',
            'gera_cobranca', 'data_liberacao_cobranca',
            'liberada_cobranca_por', 'cobranca_realizada_por',
            # Cobrança só é registrada pelo endpoint dedicado, que valida a liberação.
            'cobranca_realizada', 'numero_nf',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_complexidade_display(self, obj):
        if obj.complexidade_efetiva is None:
            return None
        return Complexidade(obj.complexidade_efetiva).label

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_liberada_cobranca_por_nome(self, obj):
        if not obj.liberada_cobranca_por:
            return None
        usuario = obj.liberada_cobranca_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_cobranca_realizada_por_nome(self, obj):
        if not obj.cobranca_realizada_por:
            return None
        usuario = obj.cobranca_realizada_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username


class RegistrarCobrancaOSORequestSerializer(serializers.Serializer):
    numero_nf = serializers.CharField(max_length=10, required=False, allow_null=True)
