from rest_framework import viewsets, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.contas.serializers import (
    UsuarioListSerializer,
    UsuarioDetailSerializer,
    UsuarioCreateSerializer,
    UsuarioUpdateSerializer,
    AlterarSenhaSerializer,
    DetalheSerializer,
)
from apps.organizacoes.permissoes import Permissao, TemPermissao, eh_diretoria, tem_permissao

Usuario = get_user_model()


class ProprioUsuarioOuGestor(BasePermission):
    message = 'Sem permissão para realizar esta ação.'

    def has_object_permission(self, request, view, obj):
        return obj == request.user or tem_permissao(request.user, Permissao.USUARIOS_GERENCIAR)


@extend_schema_view(
    list=extend_schema(
        summary='Listar usuários',
        description=(
            'Retorna a lista paginada de usuários com campos resumidos. '
            'Suporta busca textual e filtragem por setor, função e status.'
        ),
        parameters=[
            OpenApiParameter(
                'q', str,
                description='Busca por nome completo ou e-mail (parcial, sem distinção de maiúsculas).',
            ),
            OpenApiParameter('setor', int, description='Filtrar pelos usuários vinculados a um setor.'),
            OpenApiParameter('funcao', int, description='Filtrar pelos usuários que exercem uma função.'),
            OpenApiParameter(
                'ativo', str,
                description='Filtrar por status de ativação.',
                enum=['true', 'false'],
            ),
        ],
    ),
    create=extend_schema(
        summary='Criar usuário',
        description=(
            'Cria um usuário e, opcionalmente, o seu vínculo (`vinculos`: lista com no máximo um item, '
            'com `setor` e `funcao`; cada usuário pertence a um único setor). '
            'Exige `usuarios.gerenciar`, e só é possível atribuir funções cujas permissões você tem no setor. '
            'Sem vínculos, o usuário só acessa o que é dele.'
        ),
    ),
    retrieve=extend_schema(
        summary='Detalhar usuário',
        description='Retorna todos os campos cadastrais de um usuário pelo seu ID.',
    ),
    update=extend_schema(
        summary='Atualizar usuário',
        description=(
            'Substitui integralmente os dados cadastrais de um usuário. '
            'Cada usuário pode editar o próprio cadastro; gestores podem editar qualquer usuário.'
        ),
    ),
    partial_update=extend_schema(
        summary='Atualizar usuário parcialmente',
        description=(
            'Atualiza um ou mais campos cadastrais de um usuário. '
            'Cada usuário pode editar o próprio cadastro; gestores podem editar qualquer usuário.'
        ),
    ),
    destroy=extend_schema(
        summary='Remover usuário',
        description=(
            'Remove permanentemente um usuário. Requer perfil Gestor ou superior. '
            'Retorna 409 se o usuário for responsável por tarefas ou OS operacionais; nesse caso, desative-o.'
        ),
    ),
)
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.prefetch_related('vinculos_setor__setor', 'vinculos_setor__funcao').order_by('nome_completo')
    dica_exclusao_bloqueada = 'Desative o usuário em vez de excluí-lo.'

    def get_serializer_class(self):
        if self.action == 'list':
            return UsuarioListSerializer
        if self.action == 'create':
            return UsuarioCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UsuarioUpdateSerializer
        return UsuarioDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'destroy', 'ativar', 'desativar'):
            return [IsAuthenticated(), TemPermissao(Permissao.USUARIOS_GERENCIAR)]
        if self.action in ('update', 'partial_update'):
            return [IsAuthenticated(), ProprioUsuarioOuGestor()]
        return [IsAuthenticated()]

    def exigir_gestao_da_diretoria(self, alvo):
        """Usuários da diretoria só são gerenciados por quem também tem `usuarios.gerenciar_diretoria`.
        Atribuir uma função de diretoria já é barrado pela regra de não conceder o que não tem."""
        if eh_diretoria(alvo) and not tem_permissao(self.request.user, Permissao.USUARIOS_GERENCIAR_DIRETORIA):
            raise PermissionDenied('Apenas a diretoria pode gerenciar usuários da diretoria.')

    def perform_update(self, serializer):
        self.exigir_gestao_da_diretoria(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self.exigir_gestao_da_diretoria(instance)
        instance.delete()

    def get_queryset(self):
        queryset = super().get_queryset()
        q = self.request.query_params.get('q', '').strip()
        setor = self.request.query_params.get('setor', '').strip()
        funcao = self.request.query_params.get('funcao', '').strip()
        ativo = self.request.query_params.get('ativo', '').strip()

        if q:
            queryset = queryset.filter(
                Q(nome_completo__icontains=q) | Q(email__icontains=q)
            )
        if setor:
            queryset = queryset.filter(vinculos_setor__setor_id=setor)
        if funcao:
            queryset = queryset.filter(vinculos_setor__funcao_id=funcao)
        if setor or funcao:
            queryset = queryset.distinct()
        if ativo in ('true', 'false'):
            queryset = queryset.filter(is_active=(ativo == 'true'))

        return queryset

    @extend_schema(
        summary='Dados do usuário autenticado',
        description='Retorna os dados completos do usuário identificado pelo token JWT.',
        responses={200: UsuarioDetailSerializer},
    )
    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        serializer = UsuarioDetailSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary='Alterar senha',
        description=(
            'Altera a senha de um usuário. Cada usuário pode alterar a própria senha '
            'informando a senha atual. Diretores e Gestores Administrativos podem '
            'alterar a senha de qualquer usuário sem informar a senha atual.'
        ),
        request=AlterarSenhaSerializer,
        responses={
            200: DetalheSerializer,
            400: None,
            403: None,
        },
    )
    @action(detail=True, methods=['patch'], url_path='alterar-senha')
    def alterar_senha(self, request, pk=None):
        usuario = self.get_object()
        if usuario != request.user and not tem_permissao(request.user, Permissao.USUARIOS_REDEFINIR_SENHA):
            return Response(
                {'detail': 'Sem permissão para alterar a senha deste usuário.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = AlterarSenhaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        usuario.set_password(serializer.validated_data['nova_senha'])
        usuario.save(update_fields=['password'])
        return Response({'detail': 'Senha alterada com sucesso.'})

    @extend_schema(
        summary='Ativar usuário',
        description='Marca um usuário como ativo, permitindo que ele acesse o sistema. Requer perfil Gestor ou superior.',
        request=None,
        responses={200: DetalheSerializer},
    )
    @action(detail=True, methods=['patch'], url_path='ativar')
    def ativar(self, request, pk=None):
        usuario = self.get_object()
        self.exigir_gestao_da_diretoria(usuario)
        usuario.is_active = True
        usuario.save(update_fields=['is_active'])
        return Response({'detail': f'Usuário {usuario.nome_completo} ativado com sucesso.'})

    @extend_schema(
        summary='Desativar usuário',
        description=(
            'Marca um usuário como inativo, bloqueando o acesso ao sistema. '
            'Requer perfil Gestor ou superior. Não é possível desativar o próprio usuário.'
        ),
        request=None,
        responses={
            200: DetalheSerializer,
            400: None,
        },
    )
    @action(detail=True, methods=['patch'], url_path='desativar')
    def desativar(self, request, pk=None):
        usuario = self.get_object()
        self.exigir_gestao_da_diretoria(usuario)
        if usuario == request.user:
            return Response(
                {'detail': 'Não é possível desativar o próprio usuário.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        return Response({'detail': f'Usuário {usuario.nome_completo} desativado com sucesso.'})
