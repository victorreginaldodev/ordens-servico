from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.contas.emails import enviar_email_recuperacao_senha
from apps.contas.authentication.serializers import (
    LoginSerializer,
    LoginResponseSerializer,
    TokenRefreshComUsuarioSerializer,
    TokenRefreshResponseSerializer,
    LogoutSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    MessageResponseSerializer,
)
from apps.contas.serializers import UsuarioDetailSerializer


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        summary='Login',
        description='Autentica com e-mail e senha. Retorna access token, refresh token e dados do usuário.',
        responses={
            200: LoginResponseSerializer,
            401: None,
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = TokenRefreshComUsuarioSerializer

    @extend_schema(
        summary='Renovar token',
        description='Renova o access token usando o refresh token. Retorna também os dados atualizados do usuário.',
        responses={
            200: TokenRefreshResponseSerializer,
            401: None,
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Logout',
        description='Invalida o refresh token. O cliente deve descartar o access token.',
        request=LogoutSerializer,
        responses={204: None},
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Usuário autenticado',
        description='Retorna os dados do usuário autenticado pelo token.',
        responses={200: UsuarioDetailSerializer},
    )
    def get(self, request):
        serializer = UsuarioDetailSerializer(request.user)
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    authentication_classes = ()
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Solicitar redefinição de senha',
        description='Envia e-mail com link para redefinição de senha caso o e-mail pertença a um usuário ativo.',
        request=PasswordResetRequestSerializer,
        responses={
            200: MessageResponseSerializer,
            400: None,
        },
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        Usuario = get_user_model()
        usuario = Usuario.objects.filter(email__iexact=email, is_active=True).first()

        if usuario:
            uidb64 = urlsafe_base64_encode(force_bytes(usuario.pk))
            token = default_token_generator.make_token(usuario)
            composite_token = f"{uidb64}.{token}"

            frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080').rstrip('/')
            reset_url = f"{frontend_base}/reset-password?token={composite_token}"

            enviar_email_recuperacao_senha(usuario, reset_url)

        return Response(
            {'detail': 'Se o e-mail informado estiver cadastrado em nosso sistema, as instruções para redefinição foram enviadas.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    authentication_classes = ()
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Confirmar redefinição de senha',
        description='Define uma nova senha para o usuário usando o token de recuperação enviado por e-mail.',
        request=PasswordResetConfirmSerializer,
        responses={
            200: MessageResponseSerializer,
            400: None,
        },
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'detail': 'Sua senha foi redefinida com sucesso! Agora você já pode fazer login com a nova senha.'},
            status=status.HTTP_200_OK,
        )
