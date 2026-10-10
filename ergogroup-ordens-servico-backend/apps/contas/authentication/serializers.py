from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contas.serializers.usuario_serializer import (
    ResumoPermissoesSerializer, VinculoSerializer, resumo_de_permissoes,
)


class UsuarioPayloadSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    username = serializers.CharField()
    nome_completo = serializers.CharField()
    ativo = serializers.BooleanField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    vinculos = VinculoSerializer(many=True)
    permissoes = ResumoPermissoesSerializer()


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    usuario = UsuarioPayloadSerializer()


class TokenRefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    usuario = UsuarioPayloadSerializer()


def _usuario_payload(usuario):
    return {
        'id': usuario.id,
        'email': usuario.email,
        'username': usuario.username,
        'nome_completo': usuario.nome_completo,
        'ativo': usuario.is_active,
        'is_staff': usuario.is_staff,
        'is_superuser': usuario.is_superuser,
        'vinculos': VinculoSerializer(
            usuario.vinculos_setor.select_related('setor', 'funcao'), many=True,
        ).data,
        'permissoes': resumo_de_permissoes(usuario),
    }


class LoginSerializer(TokenObtainPairSerializer):
    """Retorna access, refresh e dados do usuário autenticado."""

    # Garante o campo correto mesmo que o import do simplejwt aconteça antes
    # do registry do Django estar totalmente carregado (USERNAME_FIELD = 'email').
    username_field = 'email'

    def validate(self, attrs):
        # O backend de autenticação do Django já recusa usuários com is_active=False.
        data = super().validate(attrs)
        data['usuario'] = _usuario_payload(self.user)
        return data


class TokenRefreshComUsuarioSerializer(TokenRefreshSerializer):
    """Refresh que devolve também os dados atualizados do usuário."""

    def validate(self, attrs):
        data = super().validate(attrs)

        try:
            refresh = RefreshToken(attrs['refresh'])
            user_id = refresh['user_id']
            from django.contrib.auth import get_user_model
            Usuario = get_user_model()
            usuario = Usuario.objects.get(pk=user_id)
            data['usuario'] = _usuario_payload(usuario)
        except Exception:
            pass

        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            self._token = RefreshToken(value)
        except TokenError as e:
            raise serializers.ValidationError(str(e))
        return value

    def save(self):
        self._token.blacklist()


class MessageResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        raw_token = attrs.get('token', '').strip()
        new_password = attrs.get('new_password', '')

        # O token é composto no formato <uidb64>.<token> (ou com underline como separador)
        delimiter = '.' if '.' in raw_token else ('_' if '_' in raw_token else None)
        if not delimiter:
            raise serializers.ValidationError({'token': 'Formato de token de recuperação inválido.'})

        uidb64, token_part = raw_token.split(delimiter, 1)

        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from django.contrib.auth import get_user_model
        from django.contrib.auth.tokens import default_token_generator
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        Usuario = get_user_model()

        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = Usuario.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            raise serializers.ValidationError({'token': 'Token de recuperação inválido ou expirado.'})

        if not user.is_active:
            raise serializers.ValidationError({'token': 'Usuário inativo. Entre em contato com o administrador.'})

        if not default_token_generator.check_token(user, token_part):
            raise serializers.ValidationError({'token': 'Link de redefinição inválido ou expirado.'})

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})

        self.user = user
        return attrs

    def save(self):
        new_password = self.validated_data['new_password']
        self.user.set_password(new_password)
        self.user.save()
        return self.user
