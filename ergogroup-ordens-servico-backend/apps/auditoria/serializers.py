from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.auditoria.models import RegistroAuditoria


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    entidade_display = serializers.CharField(source='get_entidade_display', read_only=True)
    acao_display = serializers.CharField(source='get_acao_display', read_only=True)
    origem_display = serializers.CharField(source='get_origem_display', read_only=True)
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = RegistroAuditoria
        fields = [
            'id', 'entidade', 'entidade_display', 'objeto_id', 'objeto_repr',
            'acao', 'acao_display', 'origem', 'origem_display', 'motivo',
            'usuario', 'usuario_nome', 'criado_em', 'alteracoes', 'snapshot',
            'ordem_servico_id', 'servico_id', 'tarefa_id', 'mini_os_id',
            'request_id', 'ip', 'user_agent',
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_usuario_nome(self, obj):
        if not obj.usuario:
            return None
        return obj.usuario.nome_completo or obj.usuario.get_full_name() or obj.usuario.username
