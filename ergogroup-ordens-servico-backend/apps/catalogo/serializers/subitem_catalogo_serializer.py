from rest_framework import serializers

from apps.catalogo.models import SubitemCatalogo


class SubitemCatalogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubitemCatalogo
        fields = '__all__'
        read_only_fields = ['criado_em', 'atualizado_em']
