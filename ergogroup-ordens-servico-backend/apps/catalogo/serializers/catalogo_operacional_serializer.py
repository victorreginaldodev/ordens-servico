from rest_framework import serializers
from apps.catalogo.models import CatalogoOperacional


class CatalogoOperacionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogoOperacional
        fields = '__all__'
