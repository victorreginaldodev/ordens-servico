from rest_framework import serializers
from apps.clientes.models import Cliente


class ClienteListSerializer(serializers.ModelSerializer):
    tipo_cliente_display = serializers.CharField(source='get_tipo_cliente_display', read_only=True)

    class Meta:
        model = Cliente
        # Traz tudo o que a listagem de clientes do frontend mostra, para a tela
        # não precisar buscar o detalhe de cada cliente.
        fields = [
            'id', 'nome', 'tipo_cliente', 'tipo_cliente_display', 'tipo_inscricao', 'numero_inscricao',
            'nome_representante', 'setor_representante', 'email_representante', 'contato_representante',
            'cobranca_revisao_alteracao', 'ativo', 'data_criacao',
        ]


class ClienteSerializer(serializers.ModelSerializer):
    tipo_cliente_display = serializers.CharField(source='get_tipo_cliente_display', read_only=True)
    tipo_inscricao_display = serializers.CharField(source='get_tipo_inscricao_display', read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['data_criacao']
