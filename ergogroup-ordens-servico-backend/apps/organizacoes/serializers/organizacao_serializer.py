from rest_framework import serializers
from apps.organizacoes.models import Organizacao


class OrganizacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizacao
        fields = [
            'id', 'nome', 'razao_social', 'cnpj', 'inscricao_estadual', 'inscricao_municipal',
            'email', 'telefone', 'site',
            'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
            'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
