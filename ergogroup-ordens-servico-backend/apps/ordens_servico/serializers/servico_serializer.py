from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.ordens_servico.models import Servico, Prioridade
from apps.catalogo.models import Catalogo
from apps.catalogo.serializers import CatalogoSerializer
from apps.ordens_servico.services.venda import avisar_chegada


class ServicoListSerializer(serializers.ModelSerializer):
    catalogo_nome = serializers.CharField(source='catalogo.nome', read_only=True, default=None)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    dias_sem_movimentacao = serializers.IntegerField(read_only=True)
    em_alerta_sem_movimentacao = serializers.BooleanField(read_only=True)
    ciencia_vigente = serializers.BooleanField(read_only=True)
    alerta_ciente_por_nome = serializers.CharField(source='alerta_ciente_por.nome_completo', read_only=True, default=None)
    cliente_nome = serializers.CharField(source='ordem_servico.cliente.nome', read_only=True, default='')
    data_venda = serializers.DateField(source='ordem_servico.data_venda', read_only=True, default=None)
    terminado_por_nome = serializers.SerializerMethodField()
    tem_tarefas = serializers.SerializerMethodField()

    class Meta:
        model = Servico
        fields = [
            'id', 'ordem_servico', 'catalogo', 'catalogo_nome', 'setor', 'setor_nome',
            'descricao', 'status', 'status_display',
            'prioridade', 'prioridade_display', 'prazo',
            'data_inicio', 'data_termino', 'data_conclusao', 'terminado_por',
            'terminado_por_nome', 'criado_em', 'atualizado_em',
            'ultima_movimentacao_em', 'dias_sem_movimentacao', 'em_alerta_sem_movimentacao',
            'alerta_ciente_em', 'alerta_ciente_por', 'alerta_ciente_por_nome', 'alerta_ciente_motivo',
            'alerta_ciente_observacao', 'ciencia_vigente',
            'cliente_nome', 'data_venda', 'tem_tarefas',
        ]

    @extend_schema_field(serializers.BooleanField())
    def get_tem_tarefas(self, obj):
        return obj.tarefas.exists()

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_terminado_por_nome(self, obj):
        if not obj.terminado_por:
            return None
        usuario = obj.terminado_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username


class ServicoSerializer(serializers.ModelSerializer):
    catalogo_detail = CatalogoSerializer(source='catalogo', read_only=True)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True, default=None)
    catalogo = serializers.PrimaryKeyRelatedField(
        queryset=Catalogo.objects.all(), allow_null=True, required=False
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade = serializers.ChoiceField(choices=Prioridade.choices, required=False)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    dias_sem_movimentacao = serializers.IntegerField(read_only=True)
    em_alerta_sem_movimentacao = serializers.BooleanField(read_only=True)
    ciencia_vigente = serializers.BooleanField(read_only=True)
    alerta_ciente_por_nome = serializers.CharField(source='alerta_ciente_por.nome_completo', read_only=True, default=None)
    terminado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = Servico
        fields = [
            'id', 'ordem_servico', 'catalogo', 'catalogo_detail', 'setor', 'setor_nome',
            'descricao', 'status', 'status_display',
            'prioridade', 'prioridade_display', 'prazo',
            'data_inicio', 'data_termino', 'data_conclusao', 'terminado_por',
            'terminado_por_nome', 'criado_em', 'atualizado_em',
            'ultima_movimentacao_em', 'dias_sem_movimentacao', 'em_alerta_sem_movimentacao',
            'alerta_ciente_em', 'alerta_ciente_por', 'alerta_ciente_por_nome', 'alerta_ciente_motivo',
            'alerta_ciente_observacao', 'ciencia_vigente',
        ]
        # Prazo, status, datas e alerta são calculados pelo sistema a partir das tarefas.
        read_only_fields = [
            'setor', 'status', 'prazo', 'data_inicio', 'data_termino', 'data_conclusao',
            'terminado_por', 'criado_em', 'atualizado_em', 'ultima_movimentacao_em',
            'alerta_ciente_em', 'alerta_ciente_por', 'alerta_ciente_motivo', 'alerta_ciente_observacao',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_terminado_por_nome(self, obj):
        if not obj.terminado_por:
            return None
        usuario = obj.terminado_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    def validate_catalogo(self, catalogo):
        mudou = self.instance is None or self.instance.catalogo_id != getattr(catalogo, 'pk', None)
        if catalogo is not None and mudou and not catalogo.ativo:
            raise serializers.ValidationError('Este catálogo está inativo e não pode ser usado em serviços novos.')
        return catalogo

    def create(self, validated_data):
        if 'prioridade' not in validated_data:
            ordem_servico = validated_data.get('ordem_servico')
            if ordem_servico is not None:
                validated_data['prioridade'] = ordem_servico.prioridade

        servico = super().create(validated_data)
        # Serviço acrescentado a uma OS existente avisa só o setor dele.
        avisar_chegada([servico])
        return servico


class ServicoDaVendaSerializer(serializers.ModelSerializer):
    """Serviço vendido, enviado junto na criação da OS (ADR 0008, 5). O setor vem do catálogo."""
    catalogo = serializers.PrimaryKeyRelatedField(queryset=Catalogo.objects.all())
    catalogo_nome = serializers.CharField(source='catalogo.nome', read_only=True, default=None)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True, default=None)
    prioridade = serializers.ChoiceField(choices=Prioridade.choices, required=False)

    class Meta:
        model = Servico
        fields = ['id', 'catalogo', 'catalogo_nome', 'setor', 'setor_nome', 'descricao', 'prioridade', 'status']
        read_only_fields = ['setor', 'status']

    def validate_catalogo(self, catalogo):
        if not catalogo.ativo:
            raise serializers.ValidationError('Este catálogo está inativo e não pode ser usado em serviços novos.')
        return catalogo
