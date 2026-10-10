from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.organizacoes.models import Setor


class OrganizadorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class SetorSerializer(serializers.ModelSerializer):
    organizadores = serializers.SerializerMethodField()
    sem_organizador = serializers.SerializerMethodField()

    class Meta:
        model = Setor
        fields = [
            'id', 'organizacao', 'nome', 'descricao', 'ativo', 'organizadores', 'sem_organizador',
            'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
        # Sem default explícito, o DRF trata booleano ausente em form/multipart como False.
        extra_kwargs = {'ativo': {'default': True}}

    def _organizadores(self, setor):
        if not hasattr(setor, '_organizadores_cache'):
            setor._organizadores_cache = setor.organizadores()
        return setor._organizadores_cache

    @extend_schema_field(OrganizadorSerializer(many=True))
    def get_organizadores(self, setor):
        """Membros do setor que o organizam: quem tem `servicos.ver_setor` e `tarefas.distribuir` nele."""
        return [{'id': usuario.id, 'nome': usuario.nome_completo} for usuario in self._organizadores(setor)]

    @extend_schema_field(serializers.BooleanField())
    def get_sem_organizador(self, setor):
        return not self._organizadores(setor)
