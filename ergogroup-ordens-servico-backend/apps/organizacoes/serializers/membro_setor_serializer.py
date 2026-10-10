from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.organizacoes.models import MembroSetor
from apps.organizacoes.permissoes import pode_conceder


class MembroSetorSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.nome_completo', read_only=True)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)
    funcao_nome = serializers.CharField(source='funcao.nome', read_only=True)

    class Meta:
        model = MembroSetor
        fields = [
            'id', 'usuario', 'usuario_nome', 'setor', 'setor_nome', 'funcao', 'funcao_nome',
            'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']

    def validate(self, attrs):
        atuais = {}
        if self.instance is not None:
            atuais = {'usuario': self.instance.usuario, 'setor': self.instance.setor, 'funcao': self.instance.funcao}
        vinculo = MembroSetor(**{**atuais, **attrs})
        outros = MembroSetor.objects.filter(usuario=vinculo.usuario)
        if self.instance is not None:
            outros = outros.exclude(pk=self.instance.pk)
        if outros.exists():
            raise serializers.ValidationError(
                {'usuario': 'Este usuário já pertence a um setor. Cada usuário pertence a um único setor.'}
            )
        try:
            vinculo.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

        usuario = self.context['request'].user
        if self.instance is not None and not pode_conceder(
            usuario, self.instance.funcao.codigos_permissao, self.instance.setor,
        ):
            raise serializers.ValidationError('Você não pode alterar um vínculo com permissões que você não tem.')
        if not pode_conceder(usuario, vinculo.funcao.codigos_permissao, vinculo.setor):
            raise serializers.ValidationError(
                {'funcao': 'Você não pode atribuir uma função com permissões que você não tem neste setor.'}
            )
        return attrs
