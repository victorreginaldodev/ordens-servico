from django.contrib import admin
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa, OrdemServicoOperacional


@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cliente', 'data_venda', 'status', 'prioridade', 'prazo',
        'valor', 'tipo_condicao', 'forma_pagamento', 'liberada_para_cobranca',
        'cobranca_realizada', 'cobranca_realizada_por',
    ]
    list_filter = [
        'status', 'prioridade', 'forma_pagamento', 'concluida',
        'cobranca_realizada', 'tipo_condicao', 'liberar_em', 'liberada_para_cobranca',
    ]
    search_fields = ['cliente__nome', 'referencia_lancamento']
    ordering = ['-data_venda']
    raw_id_fields = ['cliente', 'criado_por', 'atualizado_por', 'liberada_para_cobranca_por', 'cobranca_realizada_por']
    readonly_fields = [
        'status', 'concluida', 'criada_em', 'data_atualizacao',
        'liberada_para_cobranca', 'liberada_para_cobranca_em',
        'liberada_para_cobranca_por', 'cobranca_realizada_por',
    ]


@admin.register(Servico)
class ServicoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'ordem_servico', 'catalogo', 'setor', 'status', 'prioridade', 'prazo',
        'ultima_movimentacao_em', 'data_inicio', 'data_termino', 'terminado_por',
    ]
    list_filter = ['status', 'prioridade', 'setor']
    search_fields = ['descricao', 'ordem_servico__cliente__nome']
    raw_id_fields = ['ordem_servico', 'catalogo', 'terminado_por', 'alerta_ciente_por']
    readonly_fields = [
        'status', 'prazo', 'data_inicio', 'data_termino', 'data_conclusao',
        'terminado_por', 'criado_em', 'atualizado_em', 'ultima_movimentacao_em',
    ]


@admin.register(Tarefa)
class TarefaAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'servico', 'responsavel', 'status', 'prioridade', 'prazo',
        'data_inicio', 'data_termino',
    ]
    list_filter = ['status', 'prioridade']
    search_fields = ['descricao', 'responsavel__nome_completo']
    raw_id_fields = ['servico', 'responsavel']
    readonly_fields = ['data_inicio', 'data_termino', 'criada_em', 'atualizado_em']


@admin.register(OrdemServicoOperacional)
class OrdemServicoOperacionalAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cliente', 'catalogo_operacional', 'responsavel', 'status',
        'prioridade', 'prazo', 'horas_estimadas', 'complexidade',
        'gera_cobranca', 'cobranca_realizada', 'cobranca_realizada_por', 'data_recebimento',
    ]
    list_filter = ['status', 'prioridade', 'complexidade', 'cobranca_realizada', 'revisao_cliente', 'gera_cobranca']
    search_fields = ['cliente__nome', 'catalogo_operacional__nome', 'responsavel__nome_completo']
    raw_id_fields = ['cliente', 'catalogo_operacional', 'responsavel', 'liberada_cobranca_por', 'cobranca_realizada_por']
    readonly_fields = [
        'data_inicio', 'data_termino', 'criada_em', 'atualizado_em',
        'gera_cobranca', 'data_liberacao_cobranca',
        'liberada_cobranca_por', 'cobranca_realizada_por',
    ]
