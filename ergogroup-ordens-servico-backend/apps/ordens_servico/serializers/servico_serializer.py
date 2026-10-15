from rest_framework import exceptions, serializers
from drf_spectacular.utils import extend_schema_field

from apps.ordens_servico.models import Servico, Prioridade
from apps.catalogo.models import Catalogo
from apps.catalogo.serializers import CatalogoSerializer
from apps.catalogo.services import motivo_para_nao_trocar_o_catalogo
from apps.ordens_servico.services.venda import avisar_chegada
from apps.organizacoes.permissoes import Permissao, tem_permissao


def validar_catalogo_vendavel(catalogo):
    """Catálogo usado em serviço novo: ativo e de um setor ativo."""
    if not catalogo.ativo:
        raise serializers.ValidationError('Este catálogo está inativo e não pode ser usado em serviços novos.')
    if not catalogo.setor.ativo:
        raise serializers.ValidationError(
            f'O setor "{catalogo.setor}", que executa este catálogo, está inativo. Escolha outro serviço do catálogo.'
        )


class ServicoListSerializer(serializers.ModelSerializer):
    catalogo_nome = serializers.CharField(source='catalogo.nome', read_only=True, default=None)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    dias_sem_movimentacao = serializers.IntegerField(read_only=True)
    em_alerta_sem_movimentacao = serializers.BooleanField(read_only=True)
    ciencia_vigente = serializers.BooleanField(read_only=True)
    alerta_ciente_por_nome = serializers.CharField(source='alerta_ciente_por.nome_completo', read_only=True, default=None)
    recebido_por_nome = serializers.CharField(source='recebido_por.nome_completo', read_only=True, default=None)
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
            'recebido_em', 'recebido_por', 'recebido_por_nome',
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
        queryset=Catalogo.objects.select_related('setor'), required=False,
        help_text=(
            'Obrigatório na criação. Na edição, troca por catálogo do mesmo setor sempre; de outro setor, só com o '
            'serviço em aberto e sem tarefas (ele passa ao setor novo, que recebe o aviso de chegada).'
        ),
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade = serializers.ChoiceField(choices=Prioridade.choices, required=False)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    dias_sem_movimentacao = serializers.IntegerField(read_only=True)
    em_alerta_sem_movimentacao = serializers.BooleanField(read_only=True)
    ciencia_vigente = serializers.BooleanField(read_only=True)
    alerta_ciente_por_nome = serializers.CharField(source='alerta_ciente_por.nome_completo', read_only=True, default=None)
    recebido_por_nome = serializers.CharField(source='recebido_por.nome_completo', read_only=True, default=None)
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
            'recebido_em', 'recebido_por', 'recebido_por_nome',
        ]
        # Prazo, status, datas e alerta são calculados pelo sistema a partir das tarefas.
        read_only_fields = [
            'setor', 'status', 'prazo', 'data_inicio', 'data_termino', 'data_conclusao',
            'terminado_por', 'criado_em', 'atualizado_em', 'ultima_movimentacao_em',
            'alerta_ciente_em', 'alerta_ciente_por', 'alerta_ciente_motivo', 'alerta_ciente_observacao',
            'recebido_em', 'recebido_por',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_terminado_por_nome(self, obj):
        if not obj.terminado_por:
            return None
        usuario = obj.terminado_por
        return usuario.nome_completo or usuario.get_full_name() or usuario.username

    def validate_catalogo(self, catalogo):
        if self.instance is None or self.instance.catalogo_id != catalogo.pk:
            validar_catalogo_vendavel(catalogo)
        return catalogo

    def validate(self, attrs):
        attrs = super().validate(attrs)
        catalogo = attrs.get('catalogo')
        if self.instance is None:
            if catalogo is None:
                raise serializers.ValidationError({'catalogo': 'Escolha o serviço do catálogo.'})
            return attrs
        if catalogo is None or catalogo.setor_id == self.instance.setor_id:
            return attrs
        motivo = motivo_para_nao_trocar_o_catalogo(self.instance, catalogo)
        if motivo:
            raise serializers.ValidationError({'catalogo': motivo})
        request = self.context.get('request')
        if request is not None and not (
            tem_permissao(request.user, Permissao.OS_GERENCIAR)
            or tem_permissao(request.user, Permissao.SERVICOS_GERENCIAR, catalogo.setor_id)
        ):
            raise exceptions.PermissionDenied(
                f'Seu perfil não pode passar serviços para o setor "{catalogo.setor}".'
            )
        return attrs

    def update(self, instance, validated_data):
        """Catálogo de outro setor leva o serviço junto, como em "mover serviços em aberto": o recebimento volta a
        zero (o setor novo confirma que recebeu) e quem o organiza recebe o aviso de chegada. A troca fica na
        auditoria do serviço."""
        catalogo = validated_data.get('catalogo')
        muda_de_setor = catalogo is not None and catalogo.setor_id != instance.setor_id
        if muda_de_setor:
            validated_data.update(recebido_em=None, recebido_por=None)
        servico = super().update(instance, validated_data)
        if muda_de_setor:
            servico.registrar_movimentacao()
            avisar_chegada([servico])
        return servico

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
        validar_catalogo_vendavel(catalogo)
        return catalogo
