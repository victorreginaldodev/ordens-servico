from rest_framework import serializers
from apps.clientes.models import Cliente


class ClienteListSerializer(serializers.ModelSerializer):
    tipo_cliente_display = serializers.CharField(source='get_tipo_cliente_display', read_only=True)

    class Meta:
        model = Cliente
        fields = ['id', 'nome', 'tipo_cliente', 'tipo_cliente_display', 'numero_inscricao', 'ativo']


class ClienteSerializer(serializers.ModelSerializer):
    tipo_cliente_display = serializers.CharField(source='get_tipo_cliente_display', read_only=True)
    tipo_inscricao_display = serializers.CharField(source='get_tipo_inscricao_display', read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['data_criacao']
