from django.contrib import admin

from apps.auditoria.models import RegistroAuditoria


@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['id', 'entidade', 'objeto_id', 'acao', 'origem', 'usuario', 'criado_em']
    list_filter = ['entidade', 'acao', 'origem', 'criado_em']
    search_fields = ['objeto_repr', 'motivo', 'usuario__email', 'usuario__nome_completo']
    readonly_fields = [field.name for field in RegistroAuditoria._meta.fields]
    ordering = ['-criado_em', '-id']
