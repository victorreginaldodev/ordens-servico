"""Conferência do faturamento (faturamento/04): o que o sistema verifica para que nada concluído fique sem
cobrança, e com quem está cada pendência.

- **Garantias** são as regras da liberação (concluído → liberado). Devem dar sempre 0; se não derem, é dado fora
  de sincronia (ex.: atualização em massa que pulou o `save()`), e `corrigir()` refaz a sincronização.
- **Atenções** são os pontos em que a liberação depende de alguém (concluir, distribuir) ou em que algo mudou
  depois da liberação ou do lançamento.

A conferência é calculada na hora (não há agendamento): `verificado_em` é o momento da consulta.
"""
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone

from apps.auditoria.models import AcaoAuditoria, EntidadeAuditada, RegistroAuditoria
from apps.ordens_servico.models import OrdemServico, Servico
from apps.ordens_servico.models.ordem_servico import LiberarEm, Status
from apps.ordens_servico.models.servico import StatusServico, status_pelas_tarefas
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.services.execucao import Etapa, dias_desde, etapa_do_servico, hoje, nome
from apps.ordens_servico.services.linha_do_tempo import CAMPOS_CONDICAO

GARANTIA = 'garantia'
ATENCAO = 'atencao'
TIPOS_DE_VERIFICACAO = [GARANTIA, ATENCAO]

# Só as alterações dos últimos dias entram em "mudou depois": limita a consulta à auditoria.
DIAS_JANELA_ALTERACOES = 90
# Folga entre a liberação (ou o lançamento) e uma alteração: a venda liberada na venda cria os serviços logo
# depois da OS, na mesma requisição.
FOLGA = timedelta(minutes=2)


class Verificacao:
    SYNC_CONCLUSAO = 'sync_conclusao'
    SYNC_VENDA = 'sync_venda'
    SYNC_SERVICO = 'sync_servico'
    CONCLUIDO_OS_PARADA = 'concluido_os_parada'
    SEM_DISTRIBUIR = 'sem_distribuir'
    VENCIMENTO_CHEGANDO = 'vencimento_chegando'
    AGUARDANDO_LANCAMENTO = 'aguardando_lancamento'
    MUDOU_APOS_LIBERACAO = 'mudou_apos_liberacao'
    MUDOU_APOS_LANCAMENTO = 'mudou_apos_lancamento'


CODIGOS = [valor for chave, valor in vars(Verificacao).items() if not chave.startswith('_')]


def _definicoes():
    """Código → (tipo, situação da OS em que vale, título, explicação). Os números vêm da configuração."""
    return {
        Verificacao.SYNC_CONCLUSAO: (
            GARANTIA, 'previsao', 'Toda OS com os serviços concluídos está liberada',
            'Quando o último serviço conclui, a OS é liberada na hora. Se aparecer algo aqui, use "Corrigir agora".',
        ),
        Verificacao.SYNC_VENDA: (
            GARANTIA, 'previsao', 'Toda OS com liberação na venda está liberada',
            'A venda com liberação na venda já nasce liberada para faturar.',
        ),
        Verificacao.SYNC_SERVICO: (
            GARANTIA, 'previsao', 'Todo serviço está no status que as tarefas indicam',
            'Um serviço com as tarefas concluídas fica concluído (as tarefas canceladas não contam). Pega dados '
            'que ficaram fora de sincronia.',
        ),
        Verificacao.CONCLUIDO_OS_PARADA: (
            ATENCAO, 'previsao', 'Trabalho concluído, OS sem liberar',
            f'Há serviço concluído há {settings.DIAS_CONFERENCIA_CONCLUIDO_OS_PARADA} dias ou mais, e o que falta '
            f'está sem andamento há {settings.DIAS_ALERTA_SEM_MOVIMENTACAO} dias ou mais. Talvez alguém não tenha '
            'concluído no sistema.',
        ),
        Verificacao.SEM_DISTRIBUIR: (
            ATENCAO, 'previsao', f'Serviço sem distribuir há {settings.DIAS_CONFERENCIA_SEM_DISTRIBUIR} dias ou mais',
            'Chegou ao setor e ninguém assumiu: a OS não anda.',
        ),
        Verificacao.VENCIMENTO_CHEGANDO: (
            ATENCAO, 'previsao', 'Vencimento chegando sem liberação',
            f'O vencimento combinado é em até {settings.DIAS_CONFERENCIA_VENCIMENTO} dias (ou já passou) e a OS '
            'ainda está em execução.',
        ),
        Verificacao.AGUARDANDO_LANCAMENTO: (
            ATENCAO, 'a_faturar', f'Liberada há {settings.DIAS_ALERTA_SEM_LANCAMENTO} dias ou mais sem faturar',
            'Está na fila do financeiro.',
        ),
        Verificacao.MUDOU_APOS_LIBERACAO: (
            ATENCAO, 'a_faturar', 'Mudou depois da liberação',
            'Serviço acrescentado, cancelado ou excluído, ou valor e condição alterados depois que a OS foi '
            'liberada. Confira antes de faturar.',
        ),
        Verificacao.MUDOU_APOS_LANCAMENTO: (
            ATENCAO, 'faturadas', 'Mudou depois de faturada',
            f'Algo mudou depois do lançamento (alterações dos últimos {DIAS_JANELA_ALTERACOES} dias): ajuste no '
            'sistema financeiro.',
        ),
    }


def nome_do_servico(servico):
    return servico.catalogo.nome if servico.catalogo_id else servico.descricao


def responsaveis_pendentes(servico):
    """Quem está com o serviço: os responsáveis das tarefas não concluídas nem canceladas."""
    nomes = []
    for tarefa in servico.tarefas.all():
        if tarefa.status in (StatusTarefa.ABERTA, StatusTarefa.EM_ANDAMENTO):
            pessoa = nome(tarefa.responsavel)
            if pessoa and pessoa not in nomes:
                nomes.append(pessoa)
    return nomes


def servicos_pendentes(ordem):
    """Os serviços que faltam para a OS liberar (não concluídos nem cancelados), o mais parado primeiro."""
    pendentes = [s for s in ordem.servicos.all() if s.status in (StatusServico.ABERTO, StatusServico.EM_ANDAMENTO)]
    return sorted(pendentes, key=lambda s: (-(s.dias_sem_movimentacao or 0), s.id))


def _ordens(queryset):
    servicos = Servico.objects.select_related('catalogo', 'setor', 'terminado_por').prefetch_related(
        'tarefas__responsavel',
    ).order_by('id')
    return queryset.select_related('cliente').prefetch_related(Prefetch('servicos', queryset=servicos))


def _item(ordem, detalhe, servico=None):
    return {
        'ordem_servico_id': ordem.id,
        'cliente_nome': ordem.cliente.nome,
        'servico_id': servico.id if servico else None,
        'servico_nome': nome_do_servico(servico) if servico else None,
        'setor_nome': servico.setor.nome if servico and servico.setor_id else None,
        'responsavel_nome': (', '.join(responsaveis_pendentes(servico)) or None) if servico else None,
        'detalhe': detalhe,
    }


def _plural(n, singular, plural):
    return f'{n} {singular if n == 1 else plural}'


def _verificar_previsao(ordem, itens):
    servicos = list(ordem.servicos.all())
    ativos = [s for s in servicos if s.status != StatusServico.CANCELADO]
    concluidos = [s for s in ativos if s.status == StatusServico.CONCLUIDA]
    pendentes = servicos_pendentes(ordem)

    if ordem.liberar_em == LiberarEm.VENDA:
        itens[Verificacao.SYNC_VENDA].append(_item(ordem, 'Liberação na venda e ainda não liberada'))
    elif ativos and len(concluidos) == len(ativos):
        itens[Verificacao.SYNC_CONCLUSAO].append(_item(
            ordem, f'{_plural(len(ativos), "serviço concluído", "serviços concluídos")} e a OS não liberada',
        ))

    for servico in ativos:
        esperado = status_pelas_tarefas([t.status for t in servico.tarefas.all()])
        if servico.status != esperado:
            itens[Verificacao.SYNC_SERVICO].append(_item(
                ordem, f'Está "{servico.get_status_display()}", mas as tarefas indicam '
                       f'"{StatusServico(esperado).label}"', servico,
            ))

    dias_concluido = settings.DIAS_CONFERENCIA_CONCLUIDO_OS_PARADA
    antigos = [s for s in concluidos if s.data_termino and dias_desde(s.data_termino) >= dias_concluido]
    parados = [s for s in pendentes if (s.dias_sem_movimentacao or 0) >= settings.DIAS_ALERTA_SEM_MOVIMENTACAO]
    if antigos and parados:
        servico = parados[0]
        itens[Verificacao.CONCLUIDO_OS_PARADA].append(_item(
            ordem, f'{len(concluidos)} de {len(ativos)} concluídos; o que falta está sem andamento há '
                   f'{servico.dias_sem_movimentacao} dias', servico,
        ))

    for servico in pendentes:
        if etapa_do_servico(servico) in (Etapa.NOVO, Etapa.A_DISTRIBUIR):
            dias = dias_desde(servico.criado_em)
            if dias >= settings.DIAS_CONFERENCIA_SEM_DISTRIBUIR:
                itens[Verificacao.SEM_DISTRIBUIR].append(_item(ordem, f'Chegou ao setor há {dias} dias', servico))

    vencimento = ordem.data_acordada_cobranca
    if vencimento and vencimento <= hoje() + timedelta(days=settings.DIAS_CONFERENCIA_VENCIMENTO):
        dias = (vencimento - hoje()).days
        quando = f'venceu há {-dias} dias' if dias < 0 else 'vence hoje' if dias == 0 else f'vence em {dias} dias'
        itens[Verificacao.VENCIMENTO_CHEGANDO].append(_item(
            ordem, f'{vencimento.strftime("%d/%m/%Y")} ({quando}); {len(concluidos)} de {len(ativos)} concluídos',
            pendentes[0] if pendentes else None,
        ))


def _marco(registros, campo, padrao):
    """O momento em que o campo virou verdadeiro, pela auditoria; sem registro, o valor de `padrao`."""
    for registro in registros:
        alteracao = registro.alteracoes.get(campo)
        if registro.entidade == EntidadeAuditada.ORDEM_SERVICO and isinstance(alteracao, dict) and alteracao.get('depois'):
            return registro.criado_em
    return padrao


def _mudancas_depois(registros, marco, ordem):
    textos = []
    for registro in registros:
        if marco is None or registro.criado_em <= marco + FOLGA:
            continue
        quem = (registro.usuario.nome_completo or registro.usuario.email) if registro.usuario_id else 'o sistema'
        quando = timezone.localtime(registro.criado_em).strftime('%d/%m/%Y')
        texto = None
        if registro.entidade == EntidadeAuditada.SERVICO:
            descricao = registro.snapshot.get('descricao') or f'#{registro.objeto_id}'
            status = registro.alteracoes.get('status')
            if registro.acao == AcaoAuditoria.CRIACAO:
                texto = f'Serviço acrescentado ({descricao})'
            elif registro.acao == AcaoAuditoria.EXCLUSAO:
                texto = f'Serviço excluído ({descricao})'
            elif isinstance(status, dict) and status.get('depois') == StatusServico.CANCELADO:
                texto = f'Serviço cancelado ({descricao})'
        elif registro.acao != AcaoAuditoria.PROPAGACAO_STATUS and set(registro.alteracoes) & CAMPOS_CONDICAO:
            texto = 'Valor ou condição de pagamento alterados'
        if texto:
            textos.append(f'{texto} por {quem} em {quando}')
    return '; '.join(textos) or None


def _verificar_mudancas(ordens, itens):
    """Mudou depois da liberação (a faturar) ou do lançamento (faturadas), pela auditoria."""
    if not ordens:
        return
    desde = timezone.now() - timedelta(days=DIAS_JANELA_ALTERACOES)
    registros = RegistroAuditoria.objects.filter(
        ordem_servico_id__in=[o.id for o in ordens], criado_em__gte=desde,
        entidade__in=[EntidadeAuditada.ORDEM_SERVICO, EntidadeAuditada.SERVICO],
    ).select_related('usuario').order_by('criado_em', 'id')
    por_ordem = {}
    for registro in registros:
        por_ordem.setdefault(registro.ordem_servico_id, []).append(registro)
    for ordem in ordens:
        doc = por_ordem.get(ordem.id, [])
        if ordem.cobranca_realizada:
            padrao = timezone.make_aware(datetime.combine(ordem.data_cobranca, time.max)) if ordem.data_cobranca else None
            texto = _mudancas_depois(doc, _marco(doc, 'cobranca_realizada', padrao), ordem)
            if texto:
                itens[Verificacao.MUDOU_APOS_LANCAMENTO].append(_item(ordem, texto))
        else:
            padrao = max(filter(None, [ordem.liberada_para_cobranca_em, ordem.criada_em]), default=None)
            texto = _mudancas_depois(doc, _marco(doc, 'liberada_para_cobranca', padrao), ordem)
            if texto:
                itens[Verificacao.MUDOU_APOS_LIBERACAO].append(_item(ordem, texto))


def calcular(queryset=None):
    """Os itens de cada verificação, para as OS do `queryset` (padrão: todas)."""
    from apps.ordens_servico.services import financeiro

    queryset = OrdemServico.objects.all() if queryset is None else queryset
    itens = {codigo: [] for codigo in _definicoes()}

    for ordem in _ordens(queryset.filter(financeiro.FILTRO_SITUACAO[financeiro.Situacao.PREVISAO])):
        _verificar_previsao(ordem, itens)

    a_faturar = list(_ordens(queryset.filter(financeiro.FILTRO_SITUACAO[financeiro.Situacao.A_FATURAR])))
    for ordem in a_faturar:
        if financeiro.em_alerta(ordem):
            dias = financeiro.dias_aguardando_lancamento(ordem)
            itens[Verificacao.AGUARDANDO_LANCAMENTO].append(_item(ordem, f'Liberada há {dias} dias'))

    desde = hoje() - timedelta(days=DIAS_JANELA_ALTERACOES)
    faturadas = list(_ordens(queryset.filter(financeiro.FILTRO_SITUACAO[financeiro.Situacao.FATURADAS]).filter(
        Q(data_cobranca__gte=desde) | Q(data_cobranca__isnull=True) | Q(data_atualizacao__date__gte=desde),
    )))
    _verificar_mudancas(a_faturar + faturadas, itens)
    return itens


def pendencias_por_ordem(itens):
    """OS → códigos das verificações em que ela aparece."""
    resultado = {}
    for codigo, lista in itens.items():
        for item in lista:
            codigos = resultado.setdefault(item['ordem_servico_id'], [])
            if codigo not in codigos:
                codigos.append(codigo)
    return resultado


def conferencia():
    itens = calcular()
    return {
        'verificado_em': timezone.now(),
        'verificacoes': [{
            'codigo': codigo,
            'tipo': tipo,
            'situacao': situacao,
            'titulo': titulo,
            'explicacao': explicacao,
            'quantidade': len(itens[codigo]),
            'itens': itens[codigo],
        } for codigo, (tipo, situacao, titulo, explicacao) in _definicoes().items()],
    }


def pendencias_da_ordem(ordem):
    """As verificações em que esta OS aparece, com o detalhe (para o resumo para faturar)."""
    itens = calcular(OrdemServico.objects.filter(pk=ordem.pk))
    definicoes = _definicoes()
    return [{
        'codigo': codigo,
        'tipo': definicoes[codigo][0],
        'titulo': definicoes[codigo][2],
        'explicacao': definicoes[codigo][3],
        'detalhe': item['detalhe'],
        'servico_id': item['servico_id'],
    } for codigo, lista in itens.items() for item in lista]


@transaction.atomic
def corrigir():
    """Refaz a sincronização dos serviços e das OS ainda não liberadas. Só aplica o que a regra já manda; cada
    mudança fica na auditoria."""
    from apps.ordens_servico.services import financeiro

    ids = list(OrdemServico.objects.filter(
        financeiro.FILTRO_SITUACAO[financeiro.Situacao.PREVISAO],
    ).values_list('id', flat=True))
    servicos_corrigidos = 0
    servicos = Servico.objects.filter(ordem_servico_id__in=ids).exclude(status=StatusServico.CANCELADO)
    for servico in servicos.prefetch_related('tarefas'):
        if servico.status != status_pelas_tarefas([t.status for t in servico.tarefas.all()]):
            servico.sincronizar_status_e_rastreio()
            servicos_corrigidos += 1
    ordens_liberadas = 0
    for ordem in OrdemServico.objects.filter(id__in=ids).exclude(status=Status.CANCELADA):
        if ordem.liberada_para_cobranca:
            ordens_liberadas += 1  # liberada pela sincronização do serviço, logo acima
            continue
        ordem.sincronizar_status_e_cobranca()
        if ordem.liberada_para_cobranca:
            ordens_liberadas += 1
    return {'servicos_corrigidos': servicos_corrigidos, 'ordens_liberadas': ordens_liberadas}
