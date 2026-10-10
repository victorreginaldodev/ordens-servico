"""Blocos de informação da execução nos setores (ADRs 0006 e 0008; fase 8 do plano de execução).

Tudo aqui recebe o setor como dado: nenhuma regra conhece nomes de setores. Os cálculos devolvem dicionários
simples, que as views só serializam.
"""
from datetime import datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Case, Exists, OuterRef, Q, Value, When
from django.db.models import CharField
from django.utils import timezone

from apps.ordens_servico.models import Servico, Tarefa
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa, validar_responsavel_no_setor
from apps.ordens_servico.services.distribuicao import exigir_distribuicao_no_setor
from apps.organizacoes.models import Setor
from apps.organizacoes.permissoes import Permissao, setores_com_permissao, tem_permissao

STATUS_ATIVOS_SERVICO = (StatusServico.ABERTO, StatusServico.EM_ANDAMENTO)
STATUS_ATIVOS_TAREFA = (StatusTarefa.ABERTA, StatusTarefa.EM_ANDAMENTO)
DIAS_VENCE_EM_BREVE = 7


class Etapa:
    NA_FILA = 'na_fila'
    DISTRIBUIDO = 'distribuido'
    EM_EXECUCAO = 'em_execucao'
    CONCLUIDO = 'concluido'
    CANCELADO = 'cancelado'


class SituacaoPrazo:
    ATRASADO = 'atrasado'
    VENCE_7_DIAS = 'vence_7_dias'
    DEPOIS = 'depois'
    SEM_PRAZO = 'sem_prazo'


def hoje():
    return timezone.localdate()


def nome(usuario):
    if usuario is None:
        return None
    return usuario.nome_completo or usuario.email


def dias_desde(momento):
    if momento is None:
        return None
    data = timezone.localtime(momento).date() if isinstance(momento, datetime) else momento
    return (hoje() - data).days


def situacao_prazo(prazo):
    if prazo is None:
        return SituacaoPrazo.SEM_PRAZO
    if prazo < hoje():
        return SituacaoPrazo.ATRASADO
    if prazo <= hoje() + timedelta(days=DIAS_VENCE_EM_BREVE):
        return SituacaoPrazo.VENCE_7_DIAS
    return SituacaoPrazo.DEPOIS


# --- Consultas -------------------------------------------------------------------------------------------

def com_etapa(queryset):
    """Anota `etapa` nos serviços (ADR 0006, seção 1): na fila é aberto e sem tarefas."""
    return queryset.annotate(
        tem_tarefas=Exists(Tarefa.objects.filter(servico=OuterRef('pk'))),
    ).annotate(etapa=Case(
        When(status=StatusServico.CONCLUIDA, then=Value(Etapa.CONCLUIDO)),
        When(status=StatusServico.CANCELADO, then=Value(Etapa.CANCELADO)),
        When(status=StatusServico.EM_ANDAMENTO, then=Value(Etapa.EM_EXECUCAO)),
        When(tem_tarefas=True, then=Value(Etapa.DISTRIBUIDO)),
        default=Value(Etapa.NA_FILA),
        output_field=CharField(),
    ))


def etapa_do_servico(servico):
    """Mesma regra de `com_etapa`, em Python, para serviços já carregados com `tarefas` (sem consulta extra
    quando as tarefas vêm de `prefetch_related`)."""
    if servico.status == StatusServico.CONCLUIDA:
        return Etapa.CONCLUIDO
    if servico.status == StatusServico.CANCELADO:
        return Etapa.CANCELADO
    if servico.status == StatusServico.EM_ANDAMENTO:
        return Etapa.EM_EXECUCAO
    return Etapa.DISTRIBUIDO if servico.tarefas.all() else Etapa.NA_FILA


ETAPAS = [Etapa.NA_FILA, Etapa.DISTRIBUIDO, Etapa.EM_EXECUCAO, Etapa.CONCLUIDO, Etapa.CANCELADO]


def filtro_em_alerta(prefixo=''):
    """Serviços ativos sem movimentação nem ciência há `DIAS_ALERTA_SEM_MOVIMENTACAO` dias, no banco.
    Equivale a `Servico.em_alerta_sem_movimentacao`."""
    dias = settings.DIAS_ALERTA_SEM_MOVIMENTACAO
    limite = timezone.make_aware(datetime.combine(hoje() - timedelta(days=dias - 1), time.min))
    return (
        Q(**{f'{prefixo}status__in': STATUS_ATIVOS_SERVICO})
        & Q(**{f'{prefixo}ultima_movimentacao_em__lt': limite})
        & (Q(**{f'{prefixo}alerta_ciente_em__isnull': True}) | Q(**{f'{prefixo}alerta_ciente_em__lt': limite}))
    )


def servicos_do_setor(setor):
    return com_etapa(
        Servico.objects.filter(setor=setor)
        .select_related('catalogo', 'setor', 'ordem_servico__cliente', 'ordem_servico__criado_por',
                        'terminado_por', 'alerta_ciente_por')
    )


def tarefas_ativas(queryset=None):
    queryset = Tarefa.objects.all() if queryset is None else queryset
    return (
        queryset.filter(status__in=STATUS_ATIVOS_TAREFA, servico__status__in=STATUS_ATIVOS_SERVICO)
        .select_related('responsavel', 'servico__catalogo', 'servico__setor', 'servico__ordem_servico__cliente')
    )


# --- Acesso aos setores ----------------------------------------------------------------------------------

def setores_de_execucao():
    """Setores responsáveis por algum catálogo (ADR 0004): conceito derivado, sem campo próprio."""
    return Setor.objects.filter(ativo=True, catalogos__isnull=False).distinct()


def setores_acompanhados(usuario):
    """Setores em que o usuário tem `servicos.ver_setor`; com `setores.todos`, todos os de execução."""
    ids = setores_com_permissao(usuario, Permissao.SERVICOS_VER_SETOR)
    if ids is None:
        return setores_de_execucao().order_by('nome')
    return Setor.objects.filter(pk__in=ids, ativo=True).order_by('nome')


def acompanha(usuario, setor):
    return tem_permissao(usuario, Permissao.SERVICOS_VER_SETOR, setor)


def organiza(usuario, setor):
    return tem_permissao(usuario, Permissao.TAREFAS_DISTRIBUIR, setor)


# --- Blocos ----------------------------------------------------------------------------------------------

def resumo_dos_setores(usuario):
    """8.1: setores que a pessoa acompanha, com os contadores do painel."""
    resultado = []
    for setor in setores_acompanhados(usuario):
        servicos = servicos_do_setor(setor)
        ativos = servicos.filter(status__in=STATUS_ATIVOS_SERVICO)
        resultado.append({
            'id': setor.id,
            'nome': setor.nome,
            'organiza': organiza(usuario, setor),
            'na_fila': ativos.filter(etapa=Etapa.NA_FILA).count(),
            'em_andamento': ativos.exclude(etapa=Etapa.NA_FILA).count(),
            'atrasados': ativos.filter(prazo__lt=hoje()).count(),
            'em_alerta': servicos.filter(filtro_em_alerta()).count(),
            'sem_prazo': ativos.filter(etapa__in=[Etapa.DISTRIBUIDO, Etapa.EM_EXECUCAO], prazo__isnull=True).count(),
        })
    return resultado


def _outros_servicos_da_os(servico):
    outros = com_etapa(
        Servico.objects.filter(ordem_servico_id=servico.ordem_servico_id).exclude(pk=servico.pk)
        .select_related('catalogo', 'setor').prefetch_related('tarefas__responsavel')
    )
    return [{
        'id': outro.id,
        'catalogo_nome': outro.catalogo.nome if outro.catalogo_id else None,
        'descricao': outro.descricao,
        'setor_nome': outro.setor.nome if outro.setor_id else None,
        'etapa': outro.etapa,
        'responsaveis': sorted({nome(tarefa.responsavel) for tarefa in outro.tarefas.all()}),
    } for outro in outros]


def _contexto_da_os(servico):
    ordem = servico.ordem_servico
    return {
        'ordem_servico_id': ordem.id,
        'cliente_id': ordem.cliente_id,
        'cliente_nome': ordem.cliente.nome,
        'data_venda': ordem.data_venda,
        'vendido_por_nome': nome(ordem.criado_por),
    }


def fila(setor, filtros=None):
    """8.2: serviços do setor que chegaram e ainda não foram distribuídos, mais antigos primeiro."""
    filtros = filtros or {}
    servicos = servicos_do_setor(setor).filter(etapa=Etapa.NA_FILA, status=StatusServico.ABERTO)
    for parametro, campo in (('cliente', 'ordem_servico__cliente_id'), ('ordem_servico', 'ordem_servico_id'),
                             ('prioridade', 'prioridade')):
        if filtros.get(parametro):
            servicos = servicos.filter(**{campo: filtros[parametro]})
    return [{
        'servico_id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'descricao': servico.descricao,
        'prioridade': servico.prioridade,
        **_contexto_da_os(servico),
        'na_fila_ha_dias': dias_desde(servico.criado_em),
        'em_alerta': servico.em_alerta_sem_movimentacao,
        'outros_servicos_da_os': _outros_servicos_da_os(servico),
    } for servico in servicos.order_by('criado_em', 'id')]


@transaction.atomic
def distribuir(servico, tarefas, por):
    """8.3: cria as tarefas do serviço em um passo. Uma tarefa é a distribuição comum; várias dividem o
    serviço entre pessoas. Também serve para acrescentar tarefas a um serviço já distribuído."""
    exigir_distribuicao_no_setor(por, servico)
    for item in tarefas:
        validar_responsavel_no_setor(servico, item['responsavel'])
    for item in tarefas:
        Tarefa.objects.create(servico=servico, prioridade=item.get('prioridade') or servico.prioridade, **{
            campo: item[campo] for campo in ('responsavel', 'prazo', 'descricao') if campo in item
        })
    servico.refresh_from_db()
    return servico


def _linha_da_tarefa(tarefa):
    servico = tarefa.servico
    return {
        'tarefa_id': tarefa.id,
        'status': tarefa.status,
        'descricao': tarefa.descricao,
        'responsavel_id': tarefa.responsavel_id,
        'responsavel_nome': nome(tarefa.responsavel),
        'servico_id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'setor_nome': servico.setor.nome if servico.setor_id else None,
        'cliente_nome': servico.ordem_servico.cliente.nome,
        'ordem_servico_id': servico.ordem_servico_id,
        'prazo': tarefa.prazo,
        'situacao_prazo': situacao_prazo(tarefa.prazo),
        'idade_dias': dias_desde(tarefa.criada_em),
        'data_inicio': tarefa.data_inicio,
        'data_termino': tarefa.data_termino,
        'servico_em_alerta': servico.em_alerta_sem_movimentacao,
        'servico_dias_sem_movimentacao': servico.dias_sem_movimentacao,
    }


_ORDEM_PRAZO = [SituacaoPrazo.ATRASADO, SituacaoPrazo.VENCE_7_DIAS, SituacaoPrazo.DEPOIS, SituacaoPrazo.SEM_PRAZO]


def _por_urgencia(linhas):
    return sorted(linhas, key=lambda linha: (
        _ORDEM_PRAZO.index(linha['situacao_prazo']), linha['prazo'] or hoje(), linha['tarefa_id'],
    ))


def andamento(setor, responsavel=None):
    """8.4: tarefas ativas do setor; o frontend agrupa por responsável."""
    tarefas = tarefas_ativas().filter(servico__setor=setor)
    if responsavel:
        tarefas = tarefas.filter(responsavel_id=responsavel)
    return _por_urgencia([_linha_da_tarefa(tarefa) for tarefa in tarefas])


def _linha_do_alerta(servico):
    motivos = []
    if servico.prazo and servico.prazo < hoje():
        motivos.append('atrasado')
    if servico.em_alerta_sem_movimentacao:
        motivos.append('sem_movimentacao')
    return {
        'servico_id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'descricao': servico.descricao,
        **_contexto_da_os(servico),
        'etapa': servico.etapa,
        'prazo': servico.prazo,
        'motivos': motivos,
        'dias_sem_movimentacao': servico.dias_sem_movimentacao,
        'responsaveis': sorted({nome(tarefa.responsavel) for tarefa in servico.tarefas.all()}),
        **_ciencia(servico),
    }


def _ciencia(servico):
    return {
        'ciencia_vigente': servico.ciencia_vigente,
        'alerta_ciente_em': servico.alerta_ciente_em,
        'alerta_ciente_por_nome': nome(servico.alerta_ciente_por),
        'alerta_ciente_motivo': servico.alerta_ciente_motivo,
        'alerta_ciente_observacao': servico.alerta_ciente_observacao,
    }


def alertas(setor):
    """8.5: serviços ativos do setor atrasados ou sem movimentação, os atrasados primeiro."""
    servicos = (
        servicos_do_setor(setor)
        .filter(status__in=STATUS_ATIVOS_SERVICO)
        .filter(Q(prazo__lt=hoje()) | filtro_em_alerta())
        .prefetch_related('tarefas__responsavel')
    )
    linhas = [_linha_do_alerta(servico) for servico in servicos]
    return sorted(linhas, key=lambda linha: ('atrasado' not in linha['motivos'], -linha['dias_sem_movimentacao']))


def pode_dar_ciencia(usuario, servico):
    """Responsável por tarefa do serviço ou quem acompanha o setor (ADR 0008, 3, aprovado)."""
    return servico.tarefas.filter(responsavel=usuario).exists() or acompanha(usuario, servico.setor_id)


def concluidos(setor, de=None, ate=None):
    """8.7: serviços do setor concluídos no período (padrão: mês atual)."""
    de = de or hoje().replace(day=1)
    ate = ate or hoje()
    servicos = servicos_do_setor(setor).filter(
        status=StatusServico.CONCLUIDA, data_termino__gte=de, data_termino__lte=ate,
    ).order_by('-data_termino', '-id')
    return {'de': de, 'ate': ate, 'servicos': [{
        'servico_id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'descricao': servico.descricao,
        **_contexto_da_os(servico),
        'terminado_por_nome': nome(servico.terminado_por),
        'prazo': servico.prazo,
        'data_termino': servico.data_termino,
        'no_prazo': None if servico.prazo is None else servico.data_termino <= servico.prazo,
    } for servico in servicos]}


def equipe(setor):
    """8.8: carga de cada membro do setor (e de quem ainda tem tarefa ativa nele sem ser membro)."""
    pessoas = {
        vinculo.usuario_id: {'usuario': vinculo.usuario, 'funcao': vinculo.funcao.nome, 'membro_do_setor': True}
        for vinculo in setor.membros_ativos()
    }
    tarefas = list(tarefas_ativas().filter(servico__setor=setor))
    for tarefa in tarefas:
        pessoas.setdefault(
            tarefa.responsavel_id, {'usuario': tarefa.responsavel, 'funcao': None, 'membro_do_setor': False},
        )

    resultado = []
    for usuario_id, pessoa in pessoas.items():
        dela = [tarefa for tarefa in tarefas if tarefa.responsavel_id == usuario_id]
        situacoes = [situacao_prazo(tarefa.prazo) for tarefa in dela]
        idades = [dias_desde(tarefa.criada_em) for tarefa in dela]
        resultado.append({
            'usuario_id': usuario_id,
            'nome': nome(pessoa['usuario']),
            'funcao': pessoa['funcao'],
            'membro_do_setor': pessoa['membro_do_setor'],
            'ativos': len(dela),
            'atrasados': situacoes.count(SituacaoPrazo.ATRASADO),
            'vence_7_dias': situacoes.count(SituacaoPrazo.VENCE_7_DIAS),
            'sem_prazo': situacoes.count(SituacaoPrazo.SEM_PRAZO),
            'em_alerta': sum(1 for tarefa in dela if tarefa.servico.em_alerta_sem_movimentacao),
            'mais_antigo_dias': max(idades) if idades else None,
        })
    return sorted(resultado, key=lambda linha: (not linha['membro_do_setor'], linha['nome'] or ''))


def meus_servicos(usuario, status=None, de=None, ate=None):
    """8.9: o que está com a pessoa, os mais urgentes primeiro; com `status=concluida`, o histórico."""
    if status == StatusTarefa.CONCLUIDA:
        de = de or hoje().replace(day=1)
        ate = ate or hoje()
        tarefas = Tarefa.objects.filter(
            responsavel=usuario, status=StatusTarefa.CONCLUIDA, data_termino__gte=de, data_termino__lte=ate,
        ).select_related('responsavel', 'servico__catalogo', 'servico__setor', 'servico__ordem_servico__cliente')
        return sorted((_linha_da_tarefa(tarefa) for tarefa in tarefas), key=lambda linha: linha['data_termino'],
                      reverse=True)
    return _por_urgencia([_linha_da_tarefa(tarefa) for tarefa in tarefas_ativas().filter(responsavel=usuario)])


def detalhe_do_servico(servico, usuario):
    """8.10: o serviço com tarefas, alerta, contexto da OS sem valores e os outros serviços da OS."""
    servico = com_etapa(Servico.objects.filter(pk=servico.pk)).select_related(
        'catalogo', 'setor', 'ordem_servico__cliente', 'ordem_servico__criado_por', 'terminado_por',
        'alerta_ciente_por',
    ).get()
    ordem = servico.ordem_servico
    tarefas = servico.tarefas.select_related('responsavel').order_by('criada_em', 'id')
    return {
        'id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'descricao': servico.descricao,
        'setor_id': servico.setor_id,
        'setor_nome': servico.setor.nome if servico.setor_id else None,
        'status': servico.status,
        'etapa': servico.etapa,
        'prioridade': servico.prioridade,
        'prazo': servico.prazo,
        'situacao_prazo': situacao_prazo(servico.prazo) if servico.ativo else None,
        'data_inicio': servico.data_inicio,
        'data_termino': servico.data_termino,
        'terminado_por_nome': nome(servico.terminado_por),
        'criado_em': servico.criado_em,
        'ultima_movimentacao_em': servico.ultima_movimentacao_em,
        'dias_sem_movimentacao': servico.dias_sem_movimentacao,
        'em_alerta': servico.em_alerta_sem_movimentacao,
        **_ciencia(servico),
        'tarefas': [{
            'id': tarefa.id,
            'responsavel_id': tarefa.responsavel_id,
            'responsavel_nome': nome(tarefa.responsavel),
            'descricao': tarefa.descricao,
            'status': tarefa.status,
            'prazo': tarefa.prazo,
            'situacao_prazo': situacao_prazo(tarefa.prazo) if tarefa.status in STATUS_ATIVOS_TAREFA else None,
            'data_inicio': tarefa.data_inicio,
            'data_termino': tarefa.data_termino,
        } for tarefa in tarefas],
        'ordem_servico': {
            **_contexto_da_os(servico),
            'prioridade': ordem.prioridade,
            'observacao': ordem.observacao,
        },
        'outros_servicos_da_os': _outros_servicos_da_os(servico),
        'pode_distribuir': organiza(usuario, servico.setor_id),
        'pode_dar_ciencia': servico.ativo and pode_dar_ciencia(usuario, servico),
    }
