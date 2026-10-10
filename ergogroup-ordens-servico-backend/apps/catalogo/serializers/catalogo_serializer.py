from rest_framework import serializers
from apps.catalogo.models import Catalogo
from apps.catalogo.serializers.subitem_catalogo_serializer import (
    SubitemCatalogoSerializer,
)


class CatalogoSerializer(serializers.ModelSerializer):
    subitens = SubitemCatalogoSerializer(many=True, read_only=True)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)

    class Meta:
        model = Catalogo
        fields = ['id', 'nome', 'descricao', 'setor', 'setor_nome', 'ativo', 'subitens']
        extra_kwargs = {
            'setor': {'help_text': 'Setor responsável por executar este serviço.'},
            # Sem default explícito, o DRF trata booleano ausente em form/multipart como False.
            'ativo': {'default': True},
        }

    def validate_setor(self, setor):
        mudou = self.instance is None or self.instance.setor_id != setor.pk
        if mudou and not setor.ativo:
            raise serializers.ValidationError('Escolha um setor ativo.')
        return setor
