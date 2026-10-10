from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import exceptions, serializers

from apps.organizacoes.models import Funcao, Setor
from apps.organizacoes.permissoes import Permissao, perfil_de_acesso, tem_permissao
from apps.organizacoes.services.vinculos import definir_vinculos

Usuario = get_user_model()


class VinculoSerializer(serializers.Serializer):
    """Vínculo do usuário com um setor. Na escrita, informe `setor` e `funcao`."""
    id = serializers.IntegerField(read_only=True)
    setor = serializers.PrimaryKeyRelatedField(queryset=Setor.objects.all())
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)
    funcao = serializers.PrimaryKeyRelatedField(queryset=Funcao.objects.all())
    funcao_nome = serializers.CharField(source='funcao.nome', read_only=True)


class PermissoesNoSetorSerializer(serializers.Serializer):
    setor = serializers.IntegerField()
    setor_nome = serializers.CharField()
    permissoes = serializers.ListField(child=serializers.CharField())


class ResumoPermissoesSerializer(serializers.Serializer):
    globais = serializers.ListField(
        child=serializers.CharField(), help_text='Permissões que valem na organização toda.',
    )
    todos_os_setores = serializers.BooleanField(
        help_text='Se verdadeiro, as permissões por setor valem em qualquer setor (estão em `globais`).',
    )
    por_setor = PermissoesNoSetorSerializer(many=True)


def resumo_de_permissoes(usuario):
    perfil = perfil_de_acesso(usuario)
    nomes = dict(Setor.objects.filter(pk__in=perfil.por_setor).values_list('pk', 'nome'))
    return {
        'globais': sorted(perfil.globais),
        'todos_os_setores': perfil.todos_os_setores,
        'por_setor': [
            {'setor': setor_id, 'setor_nome': nomes.get(setor_id, ''), 'permissoes': sorted(permissoes)}
            for setor_id, permissoes in sorted(perfil.por_setor.items())
        ],
    }


class VinculosEscritaMixin:
    """Grava os vínculos enviados em `vinculos` com as proteções de `definir_vinculos`."""

    def gravar_vinculos(self, usuario, itens):
        try:
            definir_vinculos(usuario, itens, por=self.context['request'].user)
        except DjangoPermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'vinculos': exc.messages})


class UsuarioListSerializer(serializers.ModelSerializer):
    ativo = serializers.BooleanField(source='is_active', read_only=True)
    vinculos = VinculoSerializer(source='vinculos_setor', many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nome_completo', 'ativo', 'vinculos', 'data_criacao']


class UsuarioDetailSerializer(serializers.ModelSerializer):
    ativo = serializers.BooleanField(source='is_active', read_only=True)
    vinculos = VinculoSerializer(source='vinculos_setor', many=True, read_only=True)
    permissoes = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nome_completo',
            'ativo', 'is_staff', 'is_superuser',
            'vinculos', 'permissoes',
            'data_criacao', 'last_login',
        ]
        read_only_fields = ['is_staff', 'is_superuser', 'data_criacao', 'last_login']

    @extend_schema_field(ResumoPermissoesSerializer)
    def get_permissoes(self, obj):
        return resumo_de_permissoes(obj)


class UsuarioCreateSerializer(VinculosEscritaMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirmacao = serializers.CharField(write_only=True)
    ativo = serializers.BooleanField(source='is_active', default=True)
    vinculos = VinculoSerializer(many=True, required=False, help_text='Setor e função do usuário: lista com no máximo um item.')

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nome_completo',
            'ativo', 'vinculos', 'password', 'password_confirmacao',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirmacao'):
            raise serializers.ValidationError({'password_confirmacao': 'As senhas não coincidem.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        vinculos = validated_data.pop('vinculos', [])
        password = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        self.gravar_vinculos(usuario, vinculos)
        return usuario

    def to_representation(self, instance):
        return UsuarioDetailSerializer(instance, context=self.context).data


class UsuarioUpdateSerializer(VinculosEscritaMixin, serializers.ModelSerializer):
    ativo = serializers.BooleanField(source='is_active', required=False)
    vinculos = VinculoSerializer(
        many=True, required=False,
        help_text='Se enviado, substitui o vínculo do usuário (lista com no máximo um item; vazia remove o vínculo).',
    )

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'username', 'nome_completo', 'ativo', 'vinculos']
        read_only_fields = ['id']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        # Quem não gerencia usuários edita só os próprios dados cadastrais, nunca o status ou os vínculos.
        if request is None or not tem_permissao(request.user, Permissao.USUARIOS_GERENCIAR):
            fields['ativo'].read_only = True
            fields['vinculos'].read_only = True
        return fields

    @transaction.atomic
    def update(self, instance, validated_data):
        vinculos = validated_data.pop('vinculos', None)
        usuario = super().update(instance, validated_data)
        if vinculos is not None:
            self.gravar_vinculos(usuario, vinculos)
        return usuario

    def to_representation(self, instance):
        return UsuarioDetailSerializer(instance, context=self.context).data


class AlterarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True, validators=[validate_password])
    nova_senha_confirmacao = serializers.CharField(write_only=True)

    def validate_senha_atual(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value

    def validate(self, attrs):
        if attrs['nova_senha'] != attrs['nova_senha_confirmacao']:
            raise serializers.ValidationError({'nova_senha_confirmacao': 'As senhas não coincidem.'})
        return attrs


class DetalheSerializer(serializers.Serializer):
    detail = serializers.CharField()
