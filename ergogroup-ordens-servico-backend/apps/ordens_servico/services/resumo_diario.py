"""Resumo diário de pendências por e-mail (ADR 0010). Um e-mail por pessoa, só quando há pendência:

- quem organiza um setor: serviços sem ciência ou sem distribuição há `DIAS_CONFERENCIA_SEM_DISTRIBUIR` dias ou
  mais, e serviços sem movimentação há `DIAS_ALERTA_SEM_MOVIMENTACAO` dias ou mais (a ciência do alerta silencia);
- quem registra a cobrança: OS liberadas há `DIAS_ALERTA_SEM_LANCAMENTO` dias ou mais sem faturar.

Disparado pelo comando `enviar_resumo_diario`, agendado no servidor uma vez por dia útil.
"""
from django.conf import settings

from apps.contas.models import Usuario
from apps.ordens_servico.models import OrdemServico
from apps.ordens_servico.models.ordem_servico import formatar_reais
from apps.ordens_servico.services import financeiro
from apps.ordens_servico.services.execucao import (
    ETAPAS_DA_FILA, STATUS_ATIVOS_SERVICO, dias_desde, filtro_em_alerta, nome, servicos_do_setor,
    setores_de_execucao,
)
from apps.organizacoes.permissoes import Permissao, tem_permissao


def _nome_do_servico(servico):
    return servico.catalogo.nome if servico.catalogo_id else servico.descricao


def pendencias_do_setor(setor):
    """Os serviços do setor que estão parados, separados em sem distribuir e sem movimentação."""
    servicos = (
        servicos_do_setor(setor).filter(status__in=STATUS_ATIVOS_SERVICO)
        .prefetch_related('tarefas__responsavel').order_by('criado_em', 'id')
    )
    sem_distribuir, ids = [], set()
    for servico in servicos.filter(etapa__in=ETAPAS_DA_FILA):
        dias = dias_desde(servico.criado_em)
        if dias >= settings.DIAS_CONFERENCIA_SEM_DISTRIBUIR:
            ids.add(servico.id)
            sem_distribuir.append({
                'ordem_servico_id': servico.ordem_servico_id,
                'cliente': servico.ordem_servico.cliente.nome,
                'servico': _nome_do_servico(servico),
                'dias': dias,
            })
    parados = [{
        'ordem_servico_id': servico.ordem_servico_id,
        'cliente': servico.ordem_servico.cliente.nome,
        'servico': _nome_do_servico(servico),
        'responsaveis': sorted({nome(tarefa.responsavel) for tarefa in servico.tarefas.all()
                                if tarefa.status in ('aberta', 'em_andamento')}),
        'dias': servico.dias_sem_movimentacao,
    } for servico in servicos.filter(filtro_em_alerta()) if servico.id not in ids]
    parados.sort(key=lambda item: -item['dias'])
    return sem_distribuir, parados


def pendencias_do_financeiro():
    ordens = (
        OrdemServico.objects.filter(financeiro.filtro_em_alerta())
        .select_related('cliente').order_by('liberada_para_cobranca_em', 'id')
    )
    return [{
        'ordem_servico_id': ordem.id,
        'cliente': ordem.cliente.nome,
        'valor': formatar_reais(ordem.valor),
        'dias': financeiro.dias_aguardando_lancamento(ordem),
    } for ordem in ordens]


def pendencias_por_pessoa():
    """usuário → {'setores': [...], 'a_faturar': [...]}, só com quem tem alguma pendência."""
    resultado = {}

    def da_pessoa(usuario):
        return resultado.setdefault(usuario.pk, {'usuario': usuario, 'setores': [], 'a_faturar': []})

    for setor in setores_de_execucao():
        sem_distribuir, parados = pendencias_do_setor(setor)
        if not (sem_distribuir or parados):
            continue
        for usuario in setor.organizadores():
            if usuario.is_active and usuario.email:
                da_pessoa(usuario)['setores'].append(
                    {'setor': setor, 'sem_distribuir': sem_distribuir, 'parados': parados},
                )

    a_faturar = pendencias_do_financeiro()
    if a_faturar:
        for usuario in Usuario.objects.filter(is_active=True).exclude(email=''):
            if tem_permissao(usuario, Permissao.FINANCEIRO_REGISTRAR_COBRANCA):
                da_pessoa(usuario)['a_faturar'] = a_faturar

    return resultado


def enviar_resumos():
    """Envia o resumo de cada pessoa com pendência. Devolve quantos e-mails saíram."""
    from apps.ordens_servico.emails import notificar_resumo_diario

    return sum(
        notificar_resumo_diario(dados['usuario'], dados['setores'], dados['a_faturar'])
        for dados in pendencias_por_pessoa().values()
    )
