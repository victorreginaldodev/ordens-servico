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
from rest_framework.exceptions import PermissionDenied

from apps.ordens_servico.services.distribuicao import exigir_distribuicao_no_setor
from apps.organizacoes.models import Setor
from apps.organizacoes.permissoes import Permissao, setores_com_permissao, tem_permissao

STATUS_ATIVOS_SERVICO = (StatusServico.ABERTO, StatusServico.EM_ANDAMENTO)
STATUS_ATIVOS_TAREFA = (StatusTarefa.ABERTA, StatusTarefa.EM_ANDAMENTO)
DIAS_VENCE_EM_BREVE = 7


class Etapa:
    NOVO = 'novo'
    A_DISTRIBUIR = 'a_distribuir'
    DISTRIBUIDO = 'distribuido'
    EM_EXECUCAO = 'em_execucao'
    CONCLUIDO = 'concluido'
    CANCELADO = 'cancelado'


class EtapaTarefa:
    """Etapa da tarefa (ADR 0009): a aberta se divide pela ciência do responsável."""
    NOVA = 'nova'
    A_INICIAR = 'a_iniciar'
    EM_ANDAMENTO = 'em_andamento'
    CONCLUIDA = 'concluida'
    CANCELADA = 'cancelada'


ETAPAS_DA_FILA = (Etapa.NOVO, Etapa.A_DISTRIBUIR)
ETAPAS_ATIVAS_TAREFA = (EtapaTarefa.NOVA, EtapaTarefa.A_INICIAR, EtapaTarefa.EM_ANDAMENTO)


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
    """Anota `etapa` nos serviços (ADRs 0006 e 0009): sem tarefas, a ciência do setor separa novo de a distribuir."""
    return queryset.annotate(
        tem_tarefas=Exists(Tarefa.objects.filter(servico=OuterRef('pk'))),
    ).annotate(etapa=Case(
        When(status=StatusServico.CONCLUIDA, then=Value(Etapa.CONCLUIDO)),
        When(status=StatusServico.CANCELADO, then=Value(Etapa.CANCELADO)),
        When(status=StatusServico.EM_ANDAMENTO, then=Value(Etapa.EM_EXECUCAO)),
        When(tem_tarefas=True, then=Value(Etapa.DISTRIBUIDO)),
        When(recebido_em__isnull=False, then=Value(Etapa.A_DISTRIBUIR)),
        default=Value(Etapa.NOVO),
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
    if servico.tarefas.all():
        return Etapa.DISTRIBUIDO
    return Etapa.A_DISTRIBUIR if servico.recebido_em else Etapa.NOVO


ETAPAS = [Etapa.NOVO, Etapa.A_DISTRIBUIR, Etapa.DISTRIBUIDO, Etapa.EM_EXECUCAO, Etapa.CONCLUIDO, Etapa.CANCELADO]
ETAPAS_TAREFA = [EtapaTarefa.NOVA, EtapaTarefa.A_INICIAR, EtapaTarefa.EM_ANDAMENTO, EtapaTarefa.CONCLUIDA,
                 EtapaTarefa.CANCELADA]


def etapa_da_tarefa(tarefa):
    """Etapa da tarefa (ADR 0009): concluída, cancelada e em andamento vêm do status; a aberta é nova até o
    responsável dar ciência."""
    if tarefa.status != StatusTarefa.ABERTA:
        return tarefa.status
    return EtapaTarefa.A_INICIAR if tarefa.recebida_em else EtapaTarefa.NOVA


def filtro_etapa_da_tarefa(etapa, prefixo=''):
    """Q das tarefas numa etapa, para filtrar no banco."""
    if etapa == EtapaTarefa.NOVA:
        return Q(**{f'{prefixo}status': StatusTarefa.ABERTA, f'{prefixo}recebida_em__isnull': True})
    if etapa == EtapaTarefa.A_INICIAR:
        return Q(**{f'{prefixo}status': StatusTarefa.ABERTA, f'{prefixo}recebida_em__isnull': False})
    return Q(**{f'{prefixo}status': etapa})


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
                        'terminado_por', 'alerta_ciente_por', 'recebido_por')
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
            'novos': ativos.filter(etapa=Etapa.NOVO).count(),
            'a_distribuir': ativos.filter(etapa=Etapa.A_DISTRIBUIR).count(),
            'em_andamento': ativos.exclude(etapa__in=ETAPAS_DA_FILA).count(),
            'atrasados': ativos.filter(prazo__lt=hoje()).count(),
            'em_alerta': servicos.filter(filtro_em_alerta()).count(),
            'sem_prazo': ativos.filter(etapa__in=[Etapa.DISTRIBUIDO, Etapa.EM_EXECUCAO], prazo__isnull=True).count(),
            'tarefas_sem_ciencia': tarefas_ativas().filter(servico__setor=setor)
            .filter(filtro_etapa_da_tarefa(EtapaTarefa.NOVA)).count(),
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
    """8.2: serviços do setor que chegaram e ainda não foram distribuídos: os novos primeiro, depois os a
    distribuir; em cada grupo, os mais antigos primeiro."""
    filtros = filtros or {}
    etapas = [filtros['etapa']] if filtros.get('etapa') else ETAPAS_DA_FILA
    servicos = servicos_do_setor(setor).filter(etapa__in=etapas, status=StatusServico.ABERTO)
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
        'etapa': servico.etapa,
        **_recebimento(servico),
        'na_fila_ha_dias': dias_desde(servico.criado_em),
        'em_alerta': servico.em_alerta_sem_movimentacao,
        'outros_servicos_da_os': _outros_servicos_da_os(servico),
    } for servico in sorted(servicos, key=lambda servico: (servico.recebido, servico.criado_em, servico.id))]


def _recebimento(servico):
    return {'recebido_em': servico.recebido_em, 'recebido_por_nome': nome(servico.recebido_por)}


@transaction.atomic
def distribuir(servico, tarefas, por):
    """8.3: cria as tarefas do serviço em um passo. Uma tarefa é a distribuição comum; várias dividem o
    serviço entre pessoas. Também serve para acrescentar tarefas a um serviço já distribuído."""
    exigir_distribuicao_no_setor(por, servico)
    for item in tarefas:
        validar_responsavel_no_setor(servico, item['responsavel'])
    criadas = []
    for item in tarefas:
        tarefa = Tarefa(servico=servico, prioridade=item.get('prioridade') or servico.prioridade, **{
            campo: item[campo] for campo in ('responsavel', 'prazo', 'descricao') if campo in item
        })
        tarefa._aviso_agrupado = True  # um e-mail por pessoa com todas as tarefas dela, abaixo
        tarefa.save(force_insert=True)
        criadas.append(tarefa)
    from apps.ordens_servico.emails import notificar_distribuicao
    transaction.on_commit(lambda: notificar_distribuicao(criadas, por=por))
    servico.refresh_from_db()
    return servico


def _linha_da_tarefa(tarefa):
    servico = tarefa.servico
    return {
        'tarefa_id': tarefa.id,
        'status': tarefa.status,
        'etapa': etapa_da_tarefa(tarefa),
        'recebida_em': tarefa.recebida_em,
        'descricao': tarefa.descricao,
        'responsavel_id': tarefa.responsavel_id,
        'responsavel_nome': nome(tarefa.responsavel),
        'servico_id': servico.id,
        'catalogo_nome': servico.catalogo.nome if servico.catalogo_id else None,
        'servico_descricao': servico.descricao,
        'setor_nome': servico.setor.nome if servico.setor_id else None,
        'cliente_nome': servico.ordem_servico.cliente.nome,
        'ordem_servico_id': servico.ordem_servico_id,
        'prazo': tarefa.prazo,
        'situacao_prazo': situacao_prazo(tarefa.prazo),
        'idade_dias': dias_desde(tarefa.criada_em),
        'atribuida_ha_dias': dias_desde(tarefa.atribuida_em or tarefa.criada_em),
        'prioridade': tarefa.prioridade,
        'data_inicio': tarefa.data_inicio,
        'data_termino': tarefa.data_termino,
        'servico_em_alerta': servico.em_alerta_sem_movimentacao,
        'servico_dias_sem_movimentacao': servico.dias_sem_movimentacao,
        'servico_ciencia_vigente': servico.ciencia_vigente,
        'servico_ciencia_motivo': servico.alerta_ciente_motivo if servico.ciencia_vigente else None,
        'servico_ciencia_observacao': servico.alerta_ciente_observacao if servico.ciencia_vigente else None,
        'servico_ciencia_ate': servico.ciencia_ate,
    }


_ORDEM_PRAZO = [SituacaoPrazo.ATRASADO, SituacaoPrazo.VENCE_7_DIAS, SituacaoPrazo.DEPOIS, SituacaoPrazo.SEM_PRAZO]


def _por_urgencia(linhas):
    return sorted(linhas, key=lambda linha: (
        _ORDEM_PRAZO.index(linha['situacao_prazo']), linha['prazo'] or hoje(), linha['tarefa_id'],
    ))


def andamento(setor, responsavel=None, etapa=None):
    """8.4: tarefas ativas do setor; o frontend agrupa por responsável."""
    tarefas = tarefas_ativas().filter(servico__setor=setor)
    if responsavel:
        tarefas = tarefas.filter(responsavel_id=responsavel)
    if etapa:
        tarefas = tarefas.filter(filtro_etapa_da_tarefa(etapa))
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
        'ciencia_ate': servico.ciencia_ate,
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
    """8.8: carga de quem recebe tarefas do setor (lotados com `tarefas.receber` e quem "também executa" nele) e
    de quem ainda tem tarefa ativa nele sem receber mais. Também é a lista de responsáveis da distribuição."""
    pessoas = {}
    for usuario in setor.recebedores().prefetch_related('vinculos_setor__setor', 'vinculos_setor__funcao'):
        vinculo = next(iter(usuario.vinculos_setor.all()), None)
        lotado = vinculo is not None and vinculo.setor_id == setor.id
        pessoas[usuario.id] = {
            'usuario': usuario,
            'funcao': vinculo.funcao.nome if vinculo else None,
            'membro_do_setor': lotado,
            'recebe_tarefas': True,
            'setor_de_origem_nome': None if lotado or vinculo is None else vinculo.setor.nome,
        }
    tarefas = list(tarefas_ativas().filter(servico__setor=setor))
    for tarefa in tarefas:
        pessoas.setdefault(tarefa.responsavel_id, {
            'usuario': tarefa.responsavel, 'funcao': None, 'membro_do_setor': setor.tem_membro(tarefa.responsavel),
            'recebe_tarefas': False, 'setor_de_origem_nome': None,
        })

    resultado = []
    for usuario_id, pessoa in pessoas.items():
        dela = [tarefa for tarefa in tarefas if tarefa.responsavel_id == usuario_id]
        situacoes = [situacao_prazo(tarefa.prazo) for tarefa in dela]
        idades = [dias_desde(tarefa.criada_em) for tarefa in dela]
        sem_ciencia = [
            dias_desde(tarefa.atribuida_em or tarefa.criada_em) for tarefa in dela
            if etapa_da_tarefa(tarefa) == EtapaTarefa.NOVA
        ]
        resultado.append({
            'usuario_id': usuario_id,
            'nome': nome(pessoa['usuario']),
            'funcao': pessoa['funcao'],
            'membro_do_setor': pessoa['membro_do_setor'],
            'recebe_tarefas': pessoa['recebe_tarefas'],
            'setor_de_origem_nome': pessoa['setor_de_origem_nome'],
            'ativos': len(dela),
            'atrasados': situacoes.count(SituacaoPrazo.ATRASADO),
            'vence_7_dias': situacoes.count(SituacaoPrazo.VENCE_7_DIAS),
            'sem_prazo': situacoes.count(SituacaoPrazo.SEM_PRAZO),
            'em_alerta': sum(1 for tarefa in dela if tarefa.servico.em_alerta_sem_movimentacao),
            'mais_antigo_dias': max(idades) if idades else None,
            'sem_ciencia': len(sem_ciencia),
            'sem_ciencia_mais_antiga_dias': max(sem_ciencia) if sem_ciencia else None,
        })
    # Primeiro quem recebe e é do setor, depois quem também executa nele, por fim quem não recebe mais.
    return sorted(resultado, key=lambda linha: (
        not linha['recebe_tarefas'], not linha['membro_do_setor'], linha['nome'] or '',
    ))


def meus_servicos(usuario, status=None, de=None, ate=None, etapa=None):
    """8.9: o que está com a pessoa, os mais urgentes primeiro; com `status=concluida`, o histórico. Os contadores
    por etapa ficam em `contadores_meus_servicos`."""
    if status == StatusTarefa.CONCLUIDA:
        de = de or hoje().replace(day=1)
        ate = ate or hoje()
        tarefas = Tarefa.objects.filter(
            responsavel=usuario, status=StatusTarefa.CONCLUIDA, data_termino__gte=de, data_termino__lte=ate,
        ).select_related('responsavel', 'servico__catalogo', 'servico__setor', 'servico__ordem_servico__cliente')
        return sorted((_linha_da_tarefa(tarefa) for tarefa in tarefas), key=lambda linha: linha['data_termino'],
                      reverse=True)
    tarefas = tarefas_ativas().filter(responsavel=usuario)
    if etapa:
        tarefas = tarefas.filter(filtro_etapa_da_tarefa(etapa))
    return _por_urgencia([_linha_da_tarefa(tarefa) for tarefa in tarefas])


def contadores_meus_servicos(usuario):
    """Quantas tarefas ativas da pessoa estão em cada etapa (ADR 0009)."""
    tarefas = tarefas_ativas().filter(responsavel=usuario)
    return {etapa: tarefas.filter(filtro_etapa_da_tarefa(etapa)).count() for etapa in ETAPAS_ATIVAS_TAREFA}


def detalhe_do_servico(servico, usuario):
    """8.10: o serviço com tarefas, alerta, contexto da OS sem valores e os outros serviços da OS."""
    servico = com_etapa(Servico.objects.filter(pk=servico.pk)).select_related(
        'catalogo', 'setor', 'ordem_servico__cliente', 'ordem_servico__criado_por', 'terminado_por',
        'alerta_ciente_por', 'recebido_por',
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
        **_recebimento(servico),
        'pode_confirmar_recebimento': (
            servico.status == StatusServico.ABERTO and not servico.recebido and organiza(usuario, servico.setor_id)
        ),
        'tarefas': [{
            'id': tarefa.id,
            'responsavel_id': tarefa.responsavel_id,
            'responsavel_nome': nome(tarefa.responsavel),
            'descricao': tarefa.descricao,
            'status': tarefa.status,
            'etapa': etapa_da_tarefa(tarefa),
            'recebida_em': tarefa.recebida_em,
            'pode_confirmar_recebimento': (
                etapa_da_tarefa(tarefa) == EtapaTarefa.NOVA and tarefa.responsavel_id == usuario.id
            ),
            'prazo': tarefa.prazo,
            'situacao_prazo': situacao_prazo(tarefa.prazo) if tarefa.status in STATUS_ATIVOS_TAREFA else None,
            'data_inicio': tarefa.data_inicio,
            'data_termino': tarefa.data_termino,
        } for tarefa in tarefas],
        'ordem_servico': {
            **_contexto_da_os(servico),
            'prioridade': ordem.prioridade,
        },
        'outros_servicos_da_os': _outros_servicos_da_os(servico),
        'pode_distribuir': organiza(usuario, servico.setor_id),
        'pode_dar_ciencia': servico.ativo and pode_dar_ciencia(usuario, servico),
    }


# --- Ciência de recebimento (ADR 0009) -------------------------------------------------------------------

class RecebimentoInvalido(Exception):
    """Serviço ou tarefa que não aceita mais ciência (concluído ou cancelado). `args[0]` traz os ids."""


@transaction.atomic
def receber_servicos(servicos, por):
    """13.4.1: ciência do setor em um ou vários serviços. Exige `tarefas.distribuir` no setor de cada um; se faltar em
    algum, nada é gravado. Repetir não muda nada."""
    for servico in servicos:
        exigir_distribuicao_no_setor(por, servico)
    invalidos = [servico.id for servico in servicos if servico.status in (StatusServico.CONCLUIDA,
                                                                           StatusServico.CANCELADO)]
    if invalidos:
        raise RecebimentoInvalido(invalidos)
    resultado = {'recebidos': [], 'ja_recebidos': []}
    for servico in servicos:
        chave = 'recebidos' if servico.registrar_recebimento(por) else 'ja_recebidos'
        resultado[chave].append(servico.id)
    return resultado


@transaction.atomic
def receber_tarefas(tarefas, por):
    """13.4.2: ciência do responsável em uma ou várias tarefas suas. Se alguma não for dele, nada é gravado."""
    if any(tarefa.responsavel_id != por.id for tarefa in tarefas):
        raise PermissionDenied('Só o responsável pode confirmar o recebimento da tarefa.')
    invalidas = [tarefa.id for tarefa in tarefas if tarefa.status in (StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA)]
    if invalidas:
        raise RecebimentoInvalido(invalidas)
    resultado = {'recebidas': [], 'ja_recebidas': []}
    for tarefa in tarefas:
        chave = 'recebidas' if tarefa.registrar_recebimento() else 'ja_recebidas'
        resultado[chave].append(tarefa.id)
    return resultado
