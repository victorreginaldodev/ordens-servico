from django import forms
from django.contrib import admin
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.catalogo.models import Catalogo, CatalogoOperacional, SubitemCatalogo
from apps.catalogo.services import validar_setor_que_recebe


class SubitemCatalogoInline(admin.TabularInline):
    model = SubitemCatalogo
    extra = 0
    fields = ['nome', 'descricao', 'ativo', 'ordem']


class CatalogoAdminForm(forms.ModelForm):
    """Mesma regra da API (P5): catálogo ativo só em setor ativo e com quem receba tarefas."""

    class Meta:
        model = Catalogo
        fields = '__all__'

    def clean(self):
        dados = super().clean()
        setor = dados.get('setor') or (self.instance.setor if self.instance.setor_id else None)
        if setor is not None and dados.get('ativo'):
            if not setor.ativo:
                raise forms.ValidationError(f'O setor "{setor}" está inativo: escolha um setor ativo.')
            try:
                validar_setor_que_recebe(setor)
            except DRFValidationError as exc:
                raise forms.ValidationError(str(exc.detail['setor']))
        return dados


@admin.register(Catalogo)
class CatalogoAdmin(admin.ModelAdmin):
    form = CatalogoAdminForm
    list_display = ['nome', 'setor', 'ativo', 'descricao']
    list_filter = ['setor', 'ativo']
    search_fields = ['nome']
    inlines = [SubitemCatalogoInline]

    def get_readonly_fields(self, request, obj=None):
        # Mudar o setor de um catálogo existente é pelo sistema, que pergunta se os serviços em aberto vão junto.
        return ['setor'] if obj is not None else []


@admin.register(SubitemCatalogo)
class SubitemCatalogoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'catalogo', 'ativo', 'ordem']
    list_filter = ['ativo', 'catalogo']
    search_fields = ['nome', 'descricao', 'catalogo__nome']
    raw_id_fields = ['catalogo']
    readonly_fields = ['criado_em', 'atualizado_em']


@admin.register(CatalogoOperacional)
class CatalogoOperacionalAdmin(admin.ModelAdmin):
    list_display = ['nome', 'descricao', 'horas_estimadas', 'complexidade']
    list_filter = ['complexidade']
    search_fields = ['nome']
