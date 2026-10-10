from rest_framework import serializers

from apps.organizacoes.models import Funcao, MembroSetor, Setor
from apps.organizacoes.permissoes import Permissao, pode_conceder


class FuncaoSerializer(serializers.ModelSerializer):
    permissoes = serializers.ListField(
        child=serializers.ChoiceField(choices=Permissao.choices),
        source='codigos_permissao', required=False,
        help_text='Códigos das permissões que a função concede (ver permissoes-disponiveis).',
    )
    setores = serializers.PrimaryKeyRelatedField(
        queryset=Setor.objects.all(), many=True, allow_empty=False,
        help_text='Setores em que a função pode ser atribuída.',
    )
    setores_detalhe = serializers.SerializerMethodField()

    class Meta:
        model = Funcao
        fields = [
            'id', 'organizacao', 'nome', 'descricao', 'ativo', 'permissoes', 'setores', 'setores_detalhe',
            'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
        extra_kwargs = {'ativo': {'default': True}}

    def get_setores_detalhe(self, obj) -> list[dict]:
        return [{'id': setor.id, 'nome': setor.nome} for setor in obj.setores.all()]

    def validate_setores(self, setores):
        organizacao = self.initial_data.get('organizacao') or getattr(self.instance, 'organizacao_id', None)
        if any(str(setor.organizacao_id) != str(organizacao) for setor in setores):
            raise serializers.ValidationError('Os setores precisam ser da mesma organização da função.')
        if self.instance is not None:
            retirados = set(self.instance.setores.values_list('pk', flat=True)) - {s.pk for s in setores}
            em_uso = Setor.objects.filter(
                pk__in=MembroSetor.objects.filter(funcao=self.instance, setor_id__in=retirados).values('setor_id'),
            )
            if em_uso.exists():
                nomes = ', '.join(em_uso.values_list('nome', flat=True))
                raise serializers.ValidationError(
                    f'A função ainda tem pessoas vinculadas em: {nomes}. Troque esses vínculos antes de retirar o setor.'
                )
        return setores

    def validate(self, attrs):
        usuario = self.context['request'].user
        if self.instance is not None and not pode_conceder(usuario, self.instance.codigos_permissao):
            raise serializers.ValidationError(
                'Você não pode alterar uma função que concede permissões que você não tem.'
            )
        novas = set(attrs.get('codigos_permissao', [])) - set(self.instance.codigos_permissao if self.instance else [])
        if not pode_conceder(usuario, novas):
            raise serializers.ValidationError({'permissoes': 'Você não pode conceder permissões que não tem.'})
        return attrs

    def create(self, validated_data):
        codigos = validated_data.pop('codigos_permissao', [])
        funcao = super().create(validated_data)  # o ModelSerializer grava `setores` (muitos-para-muitos)
        funcao.definir_permissoes(codigos)
        return funcao

    def update(self, instance, validated_data):
        codigos = validated_data.pop('codigos_permissao', None)
        funcao = super().update(instance, validated_data)
        if codigos is not None:
            funcao.definir_permissoes(codigos)
        return funcao


class PermissaoCatalogoSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    descricao = serializers.CharField()
    escopo = serializers.ChoiceField(choices=['global', 'setor'])
