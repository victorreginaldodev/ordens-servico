from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from apps.contas.models import Usuario
from apps.organizacoes.models import MembroSetor


class MembroSetorInline(admin.TabularInline):
    model = MembroSetor
    extra = 0
    fields = ['setor', 'funcao']
    verbose_name = 'Vínculo com setor'
    verbose_name_plural = 'Setores e funções'


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ['email', 'nome_completo', 'is_active', 'is_staff', 'data_criacao']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'vinculos_setor__setor']
    search_fields = ['email', 'nome_completo', 'username']
    ordering = ['nome_completo']
    inlines = [MembroSetorInline]

    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Dados pessoais', {'fields': ('nome_completo',)}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas', {'fields': ('last_login', 'data_criacao')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'nome_completo', 'password1', 'password2'),
        }),
    )
    readonly_fields = ['data_criacao', 'last_login']
