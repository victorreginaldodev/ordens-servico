from django.contrib import admin
from apps.clientes.models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo_cliente', 'tipo_inscricao', 'numero_inscricao', 'ativo', 'data_criacao']
    list_filter = ['tipo_cliente', 'tipo_inscricao', 'ativo']
    search_fields = ['nome', 'numero_inscricao', 'email_representante']
    ordering = ['nome']
