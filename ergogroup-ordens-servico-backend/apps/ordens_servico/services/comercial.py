"""Blocos do comercial (ADR 0008, 6; fase 9 do plano): andamento das vendas e resumo completo da venda."""
from django.db.models import Exists, OuterRef, Prefetch

from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.services.execucao import ETAPAS, Etapa, etapa_do_servico, nome
from apps.organizacoes.permissoes import Permissao, tem_permissao


def andamento(ordem):
    """Quantos serviços da OS estão em cada etapa. Usa os serviços e tarefas já carregados."""
    contagem = {etapa: 0 for etapa in ETAPAS}
    servicos = list(ordem.servicos.all())
    for servico in servicos:
        contagem[etapa_do_servico(servico)] += 1
    return {'total': len(servicos), **contagem}


def filtrar_por_etapa(queryset, etapa):
    """OS com ao menos um serviço na etapa informada (ex.: `na_fila` = vendas com algo ainda não distribuído)."""
    tem_tarefas = Exists(Tarefa.objects.filter(servico=OuterRef('pk')))
    servicos = Servico.objects.annotate(tem_tarefas=tem_tarefas)
    filtros = {
        Etapa.NA_FILA: {'status': 'aberto', 'tem_tarefas': False},
        Etapa.DISTRIBUIDO: {'status': 'aberto', 'tem_tarefas': True},
        Etapa.EM_EXECUCAO: {'status': 'em_andamento'},
        Etapa.CONCLUIDO: {'status': 'concluida'},
        Etapa.CANCELADO: {'status': 'cancelado'},
    }[etapa]
    return queryset.filter(pk__in=servicos.filter(**filtros).values('ordem_servico_id'))


def _responsaveis(servico):
    return [{
        'nome': nome(tarefa.responsavel),
        'status': tarefa.status,
        'prazo': tarefa.prazo,
        'data_inicio': tarefa.data_inicio,
        'data_termino': tarefa.data_termino,
    } for tarefa in sorted(servico.tarefas.all(), key=lambda tarefa: (tarefa.criada_em, tarefa.id))]


def resumo_da_venda(ordem, usuario):
    """Quem vendeu e quando, as condições, e por serviço: setor, etapa, quem executou e quando. Condições,
    liberação e lançamento só para quem tem `financeiro.ver_valores`."""
    ordem = (
        OrdemServico.objects.filter(pk=ordem.pk)
        .select_related('cliente', 'criado_por', 'liberada_para_cobranca_por', 'cobranca_realizada_por')
        .prefetch_related(Prefetch(
            'servicos',
            queryset=Servico.objects.select_related('catalogo', 'setor', 'terminado_por')
            .prefetch_related('tarefas__responsavel').order_by('id'),
        ))
        .get()
    )
    resumo = {
        'id': ordem.id,
        'cliente_id': ordem.cliente_id,
        'cliente_nome': ordem.cliente.nome,
        'data_venda': ordem.data_venda,
        'vendido_por_nome': nome(ordem.criado_por),
        'criada_em': ordem.criada_em,
        'status': ordem.status,
        'prioridade': ordem.prioridade,
        'observacao': ordem.observacao,
        'andamento': andamento(ordem),
        'servicos': [{
            'id': servico.id,
            'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
            'descricao': servico.descricao,
            'setor_nome': servico.setor.nome if servico.setor_id else None,
            'etapa': etapa_do_servico(servico),
            'prazo': servico.prazo,
            'data_inicio': servico.data_inicio,
            'data_termino': servico.data_termino,
            'terminado_por_nome': nome(servico.terminado_por),
            'responsaveis': _responsaveis(servico),
        } for servico in ordem.servicos.all()],
        'condicoes': None,
        'financeiro': None,
    }
    if tem_permissao(usuario, Permissao.FINANCEIRO_VER_VALORES):
        resumo['condicoes'] = {
            'valor': ordem.valor,
            'valor_mensal': ordem.valor_mensal,
            'tipo_condicao': ordem.tipo_condicao,
            'condicao_resumo': ordem.condicao_resumo,
            'forma_pagamento': ordem.forma_pagamento,
            'quantidade_parcelas': ordem.quantidade_parcelas,
            'data_acordada_cobranca': ordem.data_acordada_cobranca,
            'intervalo_parcelas_dias': ordem.intervalo_parcelas_dias,
            'dia_fechamento': ordem.dia_fechamento,
            'dia_vencimento': ordem.dia_vencimento,
            'liberar_em': ordem.liberar_em,
            'nome_contato_envio_nf': ordem.nome_contato_envio_nf,
            'contato_envio_nf': ordem.contato_envio_nf,
        }
        resumo['financeiro'] = {
            'liberada_para_cobranca': ordem.liberada_para_cobranca,
            'liberada_para_cobranca_em': ordem.liberada_para_cobranca_em,
            'liberada_para_cobranca_por_nome': nome(ordem.liberada_para_cobranca_por),
            'cobranca_realizada': ordem.cobranca_realizada,
            'referencia_lancamento': ordem.referencia_lancamento,
            'data_cobranca': ordem.data_cobranca,
            'cobranca_realizada_por_nome': nome(ordem.cobranca_realizada_por),
        }
    return resumo
