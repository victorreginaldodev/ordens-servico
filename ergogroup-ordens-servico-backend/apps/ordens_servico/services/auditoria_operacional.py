"""Auditoria das OS operacionais anteriores à regra do catálogo (20/10/2026, proposta aprovada pelo usuário).

Todas as OSOs criadas antes de `DATA_DE_CORTE` (20/10/2026), sem filtro: o conjunto é determinístico pela data, não
depende de nenhum campo gravado. Mostra o que foi decidido sobre a cobrança no sistema anterior ("Revisão do
cliente"), o que chegou ao financeiro, o que a regra do catálogo diria hoje e, principalmente, **o que deveria ter
sido cobrado e não foi** (`deveria_ser_cobrada`). Serve a tela e o Excel.
"""
from collections import Counter, defaultdict
from datetime import date, datetime, time
from io import BytesIO

from django.db.models import Count, Max
from django.utils import timezone

from apps.auditoria.models import EntidadeAuditada, RegistroAuditoria
from apps.ordens_servico.models import OrdemServicoOperacional
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional
from apps.ordens_servico.services import cobranca_operacional
from apps.ordens_servico.services.execucao import nome

FINALIZADA = StatusOrdemServicoOperacional.FINALIZADA

# Dia em que a cobrança passou a vir do catálogo: entram as OSOs criadas antes dele.
DATA_DE_CORTE = date(2026, 10, 20)


class NaoCobrada:
    """Por que uma OSO finalizada e não cobrada deveria ter sido cobrada."""
    # O foco da auditoria: o catálogo cobra (e o cliente não é isento), mas ninguém marcou "Revisão do cliente".
    CATALOGO_SEM_REVISAO = 'catalogo_sem_revisao'
    # O técnico marcou "Revisão do cliente", e mesmo assim a cobrança não foi registrada.
    REVISAO_SEM_COBRANCA = 'revisao_sem_cobranca'


NAO_COBRADA = {
    NaoCobrada.CATALOGO_SEM_REVISAO: 'Catálogo cobrável, sem revisão do cliente',
    NaoCobrada.REVISAO_SEM_COBRANCA: 'Revisão do cliente marcada, não cobrada',
}


class Alerta:
    REVISAO_SEM_COBRANCA = 'revisao_sem_cobranca'
    COBRADA_SEM_GERAR = 'cobrada_sem_gerar'
    COBRADA_SEM_NF = 'cobrada_sem_nf'
    CATALOGO_COBRA_NAO_COBRADA = 'catalogo_cobra_nao_cobrada'
    FINALIZADA_SEM_TERMINO = 'finalizada_sem_termino'
    TERMINO_SEM_FINALIZAR = 'termino_sem_finalizar'
    TERMINO_ANTES_DO_INICIO = 'termino_antes_do_inicio'
    POSSIVEL_DUPLICIDADE = 'possivel_duplicidade'


# Código → (rótulo curto, explicação). A ordem é a das colunas do Excel e dos contadores da tela.
ALERTAS = {
    Alerta.REVISAO_SEM_COBRANCA: (
        'Revisão sem cobrança',
        'Finalizada: o técnico marcou "Revisão do cliente", mas a cobrança não foi registrada.',
    ),
    Alerta.COBRADA_SEM_GERAR: (
        'Cobrada sem gerar cobrança', 'Está como cobrada, mas não estava marcada para gerar cobrança.',
    ),
    Alerta.COBRADA_SEM_NF: (
        'Cobrada sem NF válida', 'Está como cobrada sem NF nem referência do lançamento, ou com a NF "0".',
    ),
    Alerta.CATALOGO_COBRA_NAO_COBRADA: (
        'Catálogo cobra, sem revisão',
        'Finalizada e não cobrada: o catálogo marca o serviço como cobrável (e o cliente não é isento), mas a '
        '"Revisão do cliente" não foi marcada, então a cobrança nunca chegou ao financeiro.',
    ),
    Alerta.FINALIZADA_SEM_TERMINO: ('Finalizada sem término', 'Está finalizada sem data de término.'),
    Alerta.TERMINO_SEM_FINALIZAR: ('Término sem finalizar', 'Tem data de término, mas não está finalizada.'),
    Alerta.TERMINO_ANTES_DO_INICIO: ('Término antes do início', 'A data de término é anterior à de início.'),
    Alerta.POSSIVEL_DUPLICIDADE: (
        'Possível duplicidade', 'Há outra OSO do mesmo cliente, serviço, responsável e data de recebimento.',
    ),
}
CODIGOS_DE_ALERTA = list(ALERTAS)

SITUACAO_LABEL = {
    'nao_gera': 'Não gera cobrança', 'nao_liberada': 'Não liberada', 'a_cobrar': 'A cobrar', 'cobrada': 'Cobrada',
}


def _situacao(oso):
    if oso.cobranca_realizada:
        return 'cobrada'
    if not oso.gera_cobranca:
        return 'nao_gera'
    return 'a_cobrar' if oso.data_liberacao_cobranca else 'nao_liberada'


def _nf_valida(oso):
    return bool(cobranca_operacional.referencia(oso))


def _historico_por_oso():
    """OSO → (quantidade de registros na auditoria, última alteração)."""
    linhas = (
        RegistroAuditoria.objects.filter(entidade=EntidadeAuditada.MINI_OS)
        .values('objeto_id').annotate(total=Count('id'), ultima=Max('criado_em'))
    )
    return {int(l['objeto_id']): (l['total'], l['ultima']) for l in linhas if str(l['objeto_id']).isdigit()}


def _osos():
    corte = timezone.make_aware(datetime.combine(DATA_DE_CORTE, time.min))
    return (
        OrdemServicoOperacional.objects.filter(criada_em__lt=corte)
        .select_related('cliente', 'catalogo_operacional', 'responsavel', 'liberada_cobranca_por', 'cobranca_realizada_por')
        .prefetch_related('catalogo_operacional__clientes_isentos_cobranca')
        .order_by('id')
    )


def linhas():
    """Uma linha por OSO anterior à regra do catálogo, com tudo o que a auditoria precisa."""
    osos = list(_osos())
    grupos = Counter((o.cliente_id, o.catalogo_operacional_id, o.responsavel_id, o.data_recebimento) for o in osos)
    historico = _historico_por_oso()
    resultado = []
    for oso in osos:
        catalogo = oso.catalogo_operacional
        isentos = {c.pk for c in catalogo.clientes_isentos_cobranca.all()}
        cliente_isento = oso.cliente_id in isentos
        cobraria_hoje = catalogo.gera_cobranca and not cliente_isento
        dias = (oso.data_termino - oso.data_recebimento).days if oso.data_termino and oso.data_recebimento else None
        finalizada_sem_cobrar = oso.status == FINALIZADA and not oso.cobranca_realizada
        if finalizada_sem_cobrar and oso.revisao_cliente:
            nao_cobrada = NaoCobrada.REVISAO_SEM_COBRANCA
        elif finalizada_sem_cobrar and cobraria_hoje:
            nao_cobrada = NaoCobrada.CATALOGO_SEM_REVISAO
        else:
            nao_cobrada = None
        referencia_do_mes = oso.data_termino or oso.data_recebimento or timezone.localdate(oso.criada_em)
        alertas = []
        if nao_cobrada == NaoCobrada.REVISAO_SEM_COBRANCA:
            alertas.append(Alerta.REVISAO_SEM_COBRANCA)
        if oso.cobranca_realizada and not oso.gera_cobranca:
            alertas.append(Alerta.COBRADA_SEM_GERAR)
        if oso.cobranca_realizada and not _nf_valida(oso):
            alertas.append(Alerta.COBRADA_SEM_NF)
        if nao_cobrada == NaoCobrada.CATALOGO_SEM_REVISAO:
            alertas.append(Alerta.CATALOGO_COBRA_NAO_COBRADA)
        if oso.status == FINALIZADA and not oso.data_termino:
            alertas.append(Alerta.FINALIZADA_SEM_TERMINO)
        if oso.status != FINALIZADA and oso.data_termino:
            alertas.append(Alerta.TERMINO_SEM_FINALIZAR)
        if oso.data_inicio and oso.data_termino and oso.data_termino < oso.data_inicio:
            alertas.append(Alerta.TERMINO_ANTES_DO_INICIO)
        if grupos[(oso.cliente_id, oso.catalogo_operacional_id, oso.responsavel_id, oso.data_recebimento)] > 1:
            alertas.append(Alerta.POSSIVEL_DUPLICIDADE)
        total_historico, ultima = historico.get(oso.id, (0, None))
        resultado.append({
            'id': oso.id,
            'cliente_nome': oso.cliente.nome,
            'cliente_documento': oso.cliente.numero_inscricao,
            'cliente_id': oso.cliente_id,
            'cliente_tipo_inscricao': oso.cliente.tipo_inscricao,
            'servico': catalogo.nome,
            'quantidade': oso.quantidade,
            'descricao': oso.descricao,
            'responsavel_nome': nome(oso.responsavel),
            'status': oso.status,
            'data_recebimento': oso.data_recebimento,
            'data_inicio': oso.data_inicio,
            'data_termino': oso.data_termino,
            'dias_ate_terminar': dias,
            'mes_referencia': referencia_do_mes.strftime('%Y-%m'),
            'revisao_cliente': oso.revisao_cliente,
            'liberada_em': oso.data_liberacao_cobranca,
            'liberada_por_nome': nome(oso.liberada_cobranca_por),
            'catalogo_cobra_hoje': catalogo.gera_cobranca,
            'cliente_isento_hoje': cliente_isento,
            'cobraria_hoje': cobraria_hoje,
            'situacao_cobranca': _situacao(oso),
            'cobrada': oso.cobranca_realizada,
            'referencia': cobranca_operacional.referencia(oso),
            'numero_nf_original': oso.numero_nf,
            'data_lancamento': oso.data_cobranca,
            'faturada_por_nome': nome(oso.cobranca_realizada_por),
            'deveria_ser_cobrada': nao_cobrada,
            'alertas': alertas,
            'alteracoes_registradas': total_historico,
            'ultima_alteracao': ultima,
        })
    return resultado


def resumo_por_servico(itens):
    por_servico = defaultdict(lambda: Counter())
    cobra_hoje = {}
    for item in itens:
        c = por_servico[item['servico']]
        c['total'] += 1
        c['finalizadas'] += item['status'] == FINALIZADA
        c['cobradas'] += item['cobrada']
        c['revisao_sem_cobranca'] += Alerta.REVISAO_SEM_COBRANCA in item['alertas']
        c['catalogo_cobra_nao_cobrada'] += Alerta.CATALOGO_COBRA_NAO_COBRADA in item['alertas']
        cobra_hoje[item['servico']] = item['catalogo_cobra_hoje']
    return [{
        'servico': servico, **{k: c[k] for k in (
            'total', 'finalizadas', 'cobradas', 'revisao_sem_cobranca', 'catalogo_cobra_nao_cobrada',
        )},
        'catalogo_cobra_hoje': cobra_hoje[servico],
    } for servico, c in sorted(por_servico.items(), key=lambda par: (-par[1]['total'], par[0]))]


def nao_cobradas_por(itens, chave):
    """As que deveriam ter sido cobradas, agrupadas por `chave` (ex.: cliente ou mês): OSOs e unidades de cada motivo."""
    grupos = defaultdict(Counter)
    for item in itens:
        if item['deveria_ser_cobrada']:
            g = grupos[chave(item)]
            g[item['deveria_ser_cobrada']] += 1
            g[f"{item['deveria_ser_cobrada']}_unidades"] += item['quantidade']
    return grupos


def auditoria():
    itens = linhas()
    contagem = Counter(codigo for item in itens for codigo in item['alertas'])
    return {
        'gerado_em': timezone.now(),
        'data_de_corte': DATA_DE_CORTE,
        'total': len(itens),
        'alertas': [{
            'codigo': codigo, 'rotulo': rotulo, 'explicacao': explicacao, 'quantidade': contagem[codigo],
        } for codigo, (rotulo, explicacao) in ALERTAS.items()],
        'osos': itens,
    }


# ── Excel ────────────────────────────────────────────────────────────────────────────────────────────────

STATUS_LABEL = dict(StatusOrdemServicoOperacional.choices)

# (cabeçalho, chave ou função, largura, formato)
COLUNAS_DO_EXCEL = [
    ('Nº da OSO', 'id', 10, '0'),
    ('Cliente', 'cliente_nome', 40, None),
    ('CNPJ/CPF', 'cliente_documento', 20, '@'),
    ('Serviço', 'servico', 40, None),
    ('Quantidade', 'quantidade', 11, '0'),
    ('Descrição', 'descricao', 50, None),
    ('Responsável', 'responsavel_nome', 28, None),
    ('Status', lambda i: STATUS_LABEL.get(i['status'], i['status']), 14, None),
    ('Recebimento', 'data_recebimento', 13, 'DD/MM/YYYY'),
    ('Início', 'data_inicio', 13, 'DD/MM/YYYY'),
    ('Término', 'data_termino', 13, 'DD/MM/YYYY'),
    ('Dias até terminar', 'dias_ate_terminar', 12, '0'),
    ('Mês de referência', 'mes_referencia', 12, '@'),
    ('Revisão do cliente', lambda i: _sim(i['revisao_cliente']), 12, None),
    ('Liberada em', 'liberada_em', 17, 'DD/MM/YYYY HH:MM'),
    ('Liberada por', 'liberada_por_nome', 28, None),
    ('Catálogo cobra hoje', lambda i: _sim(i['catalogo_cobra_hoje']), 12, None),
    ('Cliente isento hoje', lambda i: _sim(i['cliente_isento_hoje']), 12, None),
    ('Cobraria pela regra de hoje', lambda i: _sim(i['cobraria_hoje']), 14, None),
    ('Situação de cobrança', lambda i: SITUACAO_LABEL[i['situacao_cobranca']], 18, None),
    ('Cobrada', lambda i: _sim(i['cobrada']), 10, None),
    ('Referência / NF', 'referencia', 18, '@'),
    ('NF original', 'numero_nf_original', 12, '@'),
    ('Data do lançamento', 'data_lancamento', 14, 'DD/MM/YYYY'),
    ('Faturada por', 'faturada_por_nome', 28, None),
    ('Deveria ter sido cobrada', lambda i: NAO_COBRADA.get(i['deveria_ser_cobrada'], 'Não'), 34, None),
    ('Alterações registradas', 'alteracoes_registradas', 12, '0'),
    ('Última alteração', 'ultima_alteracao', 17, 'DD/MM/YYYY HH:MM'),
]


def _sim(valor):
    return 'Sim' if valor else 'Não'


def _celula(valor):
    if isinstance(valor, datetime):
        return timezone.localtime(valor).replace(tzinfo=None) if timezone.is_aware(valor) else valor
    return valor


def _aba(planilha, titulo, cabecalhos, linhas, larguras, formatos=None):
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    aba = planilha.create_sheet(titulo)
    aba.append(cabecalhos)
    for celula in aba[1]:
        celula.font = Font(bold=True, color='FFFFFF')
        celula.fill = PatternFill('solid', fgColor='1F6F68')
        celula.alignment = Alignment(vertical='center', wrap_text=True)
    for linha in linhas:
        aba.append([_celula(v) for v in linha])
    for indice, largura in enumerate(larguras, start=1):
        aba.column_dimensions[get_column_letter(indice)].width = largura
        formato = formatos[indice - 1] if formatos else None
        if formato:
            for (celula,) in aba.iter_rows(min_row=2, min_col=indice, max_col=indice):
                celula.number_format = formato
    aba.freeze_panes = 'B2'
    if linhas:
        aba.auto_filter.ref = aba.dimensions
    return aba


def _abas_do_nao_cobrado(planilha, itens):
    motivos = list(NAO_COBRADA)
    cabecalhos = [c for m in motivos for c in (f'{NAO_COBRADA[m]} (OSOs)', f'{NAO_COBRADA[m]} (unidades)')]
    por_cliente = nao_cobradas_por(itens, lambda i: i['cliente_nome'])
    linhas_cliente = sorted(
        ([cliente, *[g[c] for m in motivos for c in (m, f'{m}_unidades')], sum(g[m] for m in motivos)]
         for cliente, g in por_cliente.items()),
        key=lambda linha: (-linha[-1], linha[0]),
    )
    _aba(planilha, 'Não cobradas por cliente', ['Cliente', *cabecalhos, 'Total de OSOs'], linhas_cliente,
         [44, 22, 22, 22, 22, 14])
    por_mes = nao_cobradas_por(itens, lambda i: i['mes_referencia'])
    linhas_mes = [[mes, *[g[c] for m in motivos for c in (m, f'{m}_unidades')], sum(g[m] for m in motivos)]
                  for mes, g in sorted(por_mes.items())]
    _aba(planilha, 'Não cobradas por mês', ['Mês (término)', *cabecalhos, 'Total de OSOs'], linhas_mes,
         [14, 22, 22, 22, 22, 14])


def excel(usuario=None, cliente=None):
    """O arquivo da auditoria: OS operacionais, não cobradas por cliente e por mês, resumo por serviço e a explicação
    das colunas. Com `cliente`, só as OSOs desse cliente."""
    from openpyxl import Workbook

    dados = auditoria()
    itens = dados['osos']
    if cliente:
        itens = [i for i in itens if i['cliente_id'] == int(cliente)]
    planilha = Workbook()
    planilha.remove(planilha.active)

    _aba(
        planilha, 'OS operacionais', [c[0] for c in COLUNAS_DO_EXCEL],
        [[(c[1](item) if callable(c[1]) else item[c[1]]) for c in COLUNAS_DO_EXCEL] for item in itens],
        [c[2] for c in COLUNAS_DO_EXCEL], [c[3] for c in COLUNAS_DO_EXCEL],
    )

    _abas_do_nao_cobrado(planilha, itens)

    resumo = resumo_por_servico(itens)
    _aba(
        planilha, 'Resumo por serviço',
        ['Serviço', 'Total', 'Finalizadas', 'Cobradas', 'Revisão sem cobrança',
         'Catálogo cobra, não cobrada', 'Catálogo cobra hoje'],
        [[r['servico'], r['total'], r['finalizadas'], r['cobradas'], r['revisao_sem_cobranca'],
          r['catalogo_cobra_nao_cobrada'], _sim(r['catalogo_cobra_hoje'])] for r in resumo],
        [40, 9, 12, 10, 20, 26, 18],
    )

    gerado = timezone.localtime(dados['gerado_em']).strftime('%d/%m/%Y %H:%M')
    sobre = [
        ['Auditoria das OS operacionais anteriores à regra do catálogo'],
        [f'Gerado em {gerado}' + (f' por {nome(usuario)}' if usuario else '') + f'. {len(itens)} OS operacionais'
         + (f' do cliente {itens[0]["cliente_nome"]}.' if cliente and itens else ', sem filtro.')],
        ['Entram todas as OS operacionais criadas antes de 20/10/2026, quando a cobrança passou a vir do catálogo. As novas não entram.'],
        ['"Deveria ter sido cobrada": finalizada e não cobrada, e (1) o catálogo marca o serviço como cobrável, o cliente não é isento e a "Revisão do cliente" não foi marcada; ou (2) a "Revisão do cliente" foi marcada.'],
        ['"Mês de referência" é o mês do término (sem término, o do recebimento). Unidades = soma da quantidade das OSOs.'],
        ['"Revisão do cliente" é o que o técnico marcou no sistema anterior. "Cobraria pela regra de hoje" compara com o catálogo atual.'],
        ['"Data do lançamento" é vazia nas cobranças antigas: o sistema anterior guardava só a NF.'],
        ['"Alterações registradas" só conta o histórico desde 30/06/2026 (antes disso, só o registro da migração).'],
    ]
    aba = planilha.create_sheet('Sobre')
    for linha in sobre:
        aba.append(linha)
    aba.column_dimensions['A'].width = 34
    aba.column_dimensions['B'].width = 12
    aba.column_dimensions['C'].width = 110

    arquivo = BytesIO()
    planilha.save(arquivo)
    return arquivo.getvalue()
