"""Linha do tempo da OS e do serviço (ADR 0008, 4; fase 11 do plano).

Traduz os registros da auditoria em eventos legíveis ("Distribuído para Fulano, prazo 30/10"), sem tabela
própria. Regras:
- os registros do preenchimento inicial da auditoria (origem `migracao`) ficam de fora, porque a data deles é a
  da migração; no lugar, a OS antiga ganha um evento inicial dizendo que o histórico detalhado começa depois;
- eventos repetidos pela propagação de status são omitidos (ex.: "em execução" do serviço, que repete o
  "iniciou" da tarefa);
- condições de pagamento e a referência do lançamento só para quem tem `financeiro.ver_valores`.
"""
from datetime import date
from decimal import Decimal

from apps.auditoria.models import AcaoAuditoria, EntidadeAuditada, OrigemAuditoria, RegistroAuditoria
from apps.catalogo.models import Catalogo
from apps.contas.models import Usuario
from apps.ordens_servico.models import OrdemServico, Servico
from apps.ordens_servico.models.servico import MotivoCiencia
from apps.organizacoes.models import Setor
from apps.organizacoes.permissoes import Permissao, tem_permissao

CAMPOS_CONDICAO = {
    'valor', 'valor_mensal', 'tipo_condicao', 'forma_pagamento', 'quantidade_parcelas', 'data_acordada_cobranca',
    'intervalo_parcelas_dias', 'dia_fechamento', 'dia_vencimento', 'liberar_em',
}
CAMPOS_DE_PESSOA = ('responsavel_id', 'terminado_por_id', 'alerta_ciente_por_id', 'cobranca_realizada_por_id')
ROTULOS_OS = {
    'cliente_id': 'cliente', 'data_venda': 'data da venda', 'prioridade': 'prioridade', 'prazo': 'prazo',
    'observacao': 'observação', 'nome_contato_envio_nf': 'contato da NF', 'contato_envio_nf': 'e-mail da NF',
}


def _data(valor):
    if not valor:
        return None
    return date.fromisoformat(str(valor)[:10]).strftime('%d/%m/%Y')


class _Contexto:
    """Nomes de pessoas, setores, catálogos e serviços citados nos registros, carregados de uma vez."""

    def __init__(self, registros, usuario):
        self.ver_valores = tem_permissao(usuario, Permissao.FINANCEIRO_VER_VALORES)
        ids_usuarios, ids_setores, ids_catalogos, ids_servicos = set(), set(), set(), set()
        self.servicos_no_historico = {}
        for registro in registros:
            ids_usuarios.update(registro.snapshot.get(campo) for campo in CAMPOS_DE_PESSOA)
            troca = registro.alteracoes.get('responsavel_id')
            if isinstance(troca, dict):
                ids_usuarios.update((troca.get('antes'), troca.get('depois')))
            ids_setores.add(registro.snapshot.get('setor_id'))
            ids_catalogos.add(registro.snapshot.get('catalogo_id'))
            ids_servicos.add(registro.servico_id)
            if registro.entidade == EntidadeAuditada.SERVICO:
                self.servicos_no_historico[registro.objeto_id] = registro.snapshot
        self.usuarios = {
            u.pk: u.nome_completo or u.email for u in Usuario.objects.filter(pk__in=ids_usuarios - {None})
        }
        self.setores = dict(Setor.objects.filter(pk__in=ids_setores - {None}).values_list('pk', 'nome'))
        servicos = Servico.objects.filter(pk__in=ids_servicos - {None}).values('pk', 'catalogo_id', 'descricao')
        ids_catalogos |= {servico['catalogo_id'] for servico in servicos}
        self.catalogos = dict(Catalogo.objects.filter(pk__in=ids_catalogos - {None}).values_list('pk', 'nome'))
        for servico in servicos:
            self.servicos_no_historico.setdefault(servico['pk'], servico)

    def pessoa(self, usuario_id):
        return self.usuarios.get(usuario_id, 'alguém') if usuario_id else 'o sistema'

    def servico(self, servico_id):
        dados = self.servicos_no_historico.get(servico_id) or {}
        return self.catalogos.get(dados.get('catalogo_id')) or dados.get('descricao') or f'Serviço #{servico_id}'


def _evento(registro, tipo, texto):
    return {
        'quando': registro.criado_em,
        'quem': (registro.usuario.nome_completo or registro.usuario.email) if registro.usuario_id else None,
        'tipo': tipo,
        'texto': texto,
        'ordem_servico_id': registro.ordem_servico_id,
        'servico_id': registro.servico_id,
        'tarefa_id': registro.tarefa_id,
    }


def _mudou(registro, campo):
    alteracao = registro.alteracoes.get(campo)
    return alteracao if isinstance(alteracao, dict) and alteracao.get('antes') != alteracao.get('depois') else None


def _eventos_da_os(registro, ctx):
    snap = registro.snapshot
    if registro.acao == AcaoAuditoria.CRIACAO:
        texto = 'Venda registrada'
        if ctx.ver_valores:
            texto += f' — {_condicao(snap)}'
        return [_evento(registro, 'venda', texto)]
    eventos = []
    status = _mudou(registro, 'status')
    if status:
        textos = {'concluida': 'OS concluída: todos os serviços terminaram', 'cancelada': 'OS cancelada'}
        if status['depois'] in textos:
            eventos.append(_evento(registro, 'os_' + status['depois'], textos[status['depois']]))
        elif status['antes'] in ('concluida', 'cancelada'):
            eventos.append(_evento(registro, 'os_reaberta', 'OS reaberta'))
    liberada = _mudou(registro, 'liberada_para_cobranca')
    if liberada and liberada['depois']:
        quando = 'na venda' if snap.get('liberar_em') == 'venda' else 'na conclusão dos serviços'
        eventos.append(_evento(registro, 'liberacao', f'OS liberada para o financeiro ({quando})'))
    faturada = _mudou(registro, 'cobranca_realizada')
    if faturada and faturada['depois']:
        texto = f'OS faturada por {ctx.pessoa(snap.get("cobranca_realizada_por_id"))}'
        if ctx.ver_valores and snap.get('referencia_lancamento'):
            texto += f' (ref. {snap["referencia_lancamento"]})'
        eventos.append(_evento(registro, 'lancamento', texto))
    campos = set(registro.alteracoes)
    if ctx.ver_valores and campos & CAMPOS_CONDICAO and registro.acao != AcaoAuditoria.PROPAGACAO_STATUS:
        eventos.append(_evento(registro, 'condicao_alterada', f'Condições de pagamento alteradas: {_condicao(snap)}'))
    alterados = [rotulo for campo, rotulo in ROTULOS_OS.items() if campo in campos]
    if alterados:
        eventos.append(_evento(registro, 'venda_alterada', 'Venda alterada: ' + ', '.join(alterados)))
    return eventos


def _condicao(snap):
    """O `condicao_resumo` da OS como ela estava no registro."""
    campos = {campo: snap.get(campo) for campo in CAMPOS_CONDICAO - {'valor', 'forma_pagamento', 'liberar_em'}}
    if campos.get('data_acordada_cobranca'):
        campos['data_acordada_cobranca'] = date.fromisoformat(str(campos['data_acordada_cobranca'])[:10])
    if campos.get('valor_mensal') is not None:
        campos['valor_mensal'] = Decimal(str(campos['valor_mensal']))
    return OrdemServico(**{campo: valor for campo, valor in campos.items() if valor is not None}).condicao_resumo


def _eventos_do_servico(registro, ctx):
    snap = registro.snapshot
    nome = ctx.servico(registro.objeto_id)
    if registro.acao == AcaoAuditoria.CRIACAO:
        setor = ctx.setores.get(snap.get('setor_id'))
        texto = f'{nome} chegou a {setor}' if setor else f'{nome} registrado na venda'
        return [_evento(registro, 'chegada', texto)]
    if registro.acao == AcaoAuditoria.EXCLUSAO:
        return [_evento(registro, 'servico_excluido', f'{nome} excluído da venda')]
    if registro.acao == AcaoAuditoria.CIENCIA_ALERTA:
        texto = f'{ctx.pessoa(snap.get("alerta_ciente_por_id"))} confirmou que está tudo bem com {nome}'
        if snap.get('alerta_ciente_motivo'):
            texto += f' ({MotivoCiencia(snap["alerta_ciente_motivo"]).label.lower()})'
        if snap.get('alerta_ciente_observacao'):
            texto += f': {snap["alerta_ciente_observacao"]}'
        return [_evento(registro, 'ciencia', texto)]
    status = _mudou(registro, 'status')
    if not status:
        return []
    if status['depois'] == 'concluida':
        quem = ctx.pessoa(snap.get('terminado_por_id'))
        return [_evento(registro, 'servico_concluido', f'{nome} concluído por {quem}')]
    if status['depois'] == 'cancelado':
        return [_evento(registro, 'servico_cancelado', f'{nome} cancelado')]
    if status['antes'] in ('concluida', 'cancelado'):
        return [_evento(registro, 'servico_reaberto', f'{nome} reaberto')]
    return []


def _eventos_da_tarefa(registro, ctx):
    snap = registro.snapshot
    servico = ctx.servico(registro.servico_id)
    responsavel = ctx.pessoa(snap.get('responsavel_id'))
    if registro.acao == AcaoAuditoria.CRIACAO:
        texto = f'{servico} distribuído para {responsavel}'
        if snap.get('prazo'):
            texto += f', prazo {_data(snap["prazo"])}'
        return [_evento(registro, 'distribuicao', texto)]
    if registro.acao == AcaoAuditoria.EXCLUSAO:
        return [_evento(registro, 'tarefa_excluida', f'Tarefa de {responsavel} em {servico} excluída')]
    eventos = []
    troca = _mudou(registro, 'responsavel_id')
    if troca:
        eventos.append(_evento(
            registro, 'reatribuicao',
            f'{servico} passou de {ctx.pessoa(troca["antes"])} para {ctx.pessoa(troca["depois"])}',
        ))
    prazo = _mudou(registro, 'prazo')
    if prazo:
        if prazo['antes']:
            novo = _data(prazo['depois']) or 'sem prazo'
            texto = f'Prazo de {servico} ({responsavel}) alterado de {_data(prazo["antes"])} para {novo}'
        else:
            texto = f'Prazo de {servico} ({responsavel}) definido para {_data(prazo["depois"])}'
        eventos.append(_evento(registro, 'prazo_alterado', texto))
    status = _mudou(registro, 'status')
    if status:
        textos = {
            'em_andamento': ('tarefa_iniciada', f'{responsavel} iniciou {servico}'),
            'concluida': ('tarefa_concluida', f'{responsavel} concluiu {servico}'),
            'cancelada': ('tarefa_cancelada', f'Tarefa de {responsavel} em {servico} cancelada'),
        }
        if status['depois'] in textos:
            eventos.append(_evento(registro, *textos[status['depois']]))
        elif status['antes'] in ('concluida', 'cancelada'):
            eventos.append(_evento(registro, 'tarefa_reaberta', f'Tarefa de {responsavel} em {servico} reaberta'))
    return eventos


TRADUTORES = {
    EntidadeAuditada.ORDEM_SERVICO: _eventos_da_os,
    EntidadeAuditada.SERVICO: _eventos_do_servico,
    EntidadeAuditada.TAREFA: _eventos_da_tarefa,
}


def _montar(registros, usuario, ordem=None):
    registros = list(registros.select_related('usuario').order_by('criado_em', 'id'))
    do_historico_inicial = [r for r in registros if r.origem == OrigemAuditoria.MIGRACAO]
    registros = [r for r in registros if r.origem != OrigemAuditoria.MIGRACAO]
    ctx = _Contexto(registros, usuario)
    eventos = []
    if ordem is not None and do_historico_inicial:
        eventos.append({
            'quando': do_historico_inicial[0].criado_em,
            'quem': None,
            'tipo': 'historico_anterior',
            'texto': (
                f'Venda de {ordem.data_venda.strftime("%d/%m/%Y")}, registrada antes do histórico detalhado: '
                'o que aconteceu até aqui não foi registrado passo a passo.'
            ),
            'ordem_servico_id': ordem.id,
            'servico_id': None,
            'tarefa_id': None,
        })
    for registro in registros:
        tradutor = TRADUTORES.get(registro.entidade)
        if tradutor:
            eventos.extend(tradutor(registro, ctx))
    return eventos


def linha_do_tempo_da_os(ordem, usuario):
    """A venda inteira: os eventos da OS e de todos os seus serviços e tarefas."""
    return _montar(RegistroAuditoria.objects.filter(ordem_servico_id=ordem.pk), usuario, ordem=ordem)


def linha_do_tempo_do_servico(servico, usuario):
    """Só o serviço e suas tarefas."""
    return _montar(
        RegistroAuditoria.objects.filter(servico_id=servico.pk).exclude(entidade=EntidadeAuditada.ORDEM_SERVICO),
        usuario,
    )
