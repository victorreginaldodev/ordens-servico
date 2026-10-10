from django.contrib import admin
from apps.organizacoes.models import Funcao, FuncaoPermissao, MembroSetor, Organizacao, Setor


@admin.register(Organizacao)
class OrganizacaoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'razao_social', 'cnpj', 'cidade', 'uf']
    search_fields = ['nome', 'razao_social', 'cnpj']
    readonly_fields = ['criado_em', 'atualizado_em']


@admin.register(Setor)
class SetorAdmin(admin.ModelAdmin):
    list_display = ['nome', 'organizacao', 'ativo', 'criado_em']
    list_filter = ['organizacao', 'ativo']
    search_fields = ['nome', 'descricao']
    readonly_fields = ['criado_em', 'atualizado_em']


class FuncaoPermissaoInline(admin.TabularInline):
    model = FuncaoPermissao
    extra = 0


@admin.register(Funcao)
class FuncaoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'organizacao', 'ativo']
    list_filter = ['organizacao', 'setores', 'ativo']
    filter_horizontal = ['setores']
    search_fields = ['nome', 'descricao']
    readonly_fields = ['criado_em', 'atualizado_em']
    inlines = [FuncaoPermissaoInline]


@admin.register(MembroSetor)
class MembroSetorAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'setor', 'funcao']
    list_filter = ['setor', 'funcao']
    search_fields = ['usuario__nome_completo', 'usuario__email']
    raw_id_fields = ['usuario']
