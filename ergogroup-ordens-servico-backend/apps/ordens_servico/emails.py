"""Notificações por e-mail (ADR 0010). Regras: só avisa quem tem algo a fazer; nunca quem fez a ação; um e-mail
por pessoa por ação; atrasos só no resumo diário de pendências."""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.contas.models import Usuario
from apps.organizacoes.permissoes import Permissao, tem_permissao
from apps.ordens_servico.models.ordem_servico import Prioridade

logger = logging.getLogger(__name__)

CORES_PRIORIDADE = {
    Prioridade.BAIXA: '#64748B',
    Prioridade.MEDIA: '#EAB308',
    Prioridade.ALTA: '#EF4444',
}


def ator_atual():
    """Quem está fazendo a ação nesta requisição (pelo contexto da auditoria); None fora de uma requisição.
    Lido na hora de agendar o envio, porque o e-mail sai só no fim da transação."""
    from apps.auditoria.context import get_auditoria_context, usuario_do_contexto

    return usuario_do_contexto(get_auditoria_context())


def _usuarios_ativos():
    return Usuario.objects.filter(is_active=True).exclude(email='')


def _emails_com_permissao(permissao):
    return [u.email for u in _usuarios_ativos() if tem_permissao(u, permissao)]


def _enviar(assunto, template, contexto, destinatarios, excluir=None):
    if not settings.EMAIL_NOTIFICATIONS_ENABLED:
        return 0

    # Quem fez a ação não recebe o aviso dela.
    email_do_ator = (getattr(excluir, 'email', '') or '').lower()
    destinatarios = [email for email in dict.fromkeys(destinatarios) if email and email.lower() != email_do_ator]
    if not destinatarios:
        return 0

    html_content = render_to_string(template, contexto)
    email = EmailMultiAlternatives(
        assunto,
        assunto,
        settings.DEFAULT_FROM_EMAIL,
        destinatarios,
    )
    email.attach_alternative(html_content, 'text/html')
    # Notificação por e-mail nunca pode derrubar a operação de negócio que a
    # disparou: isso roda dentro de transaction.on_commit, no mesmo request,
    # e uma falha de SMTP aqui já quebrou a aplicação inteira no passado.
    try:
        email.send(fail_silently=False)
    except Exception:
        logger.exception('Falha ao enviar e-mail de notificação: %s', assunto)
        return 0
    return len(destinatarios)


def _nome_do_servico(servico):
    return servico.catalogo.nome if servico.catalogo_id else servico.descricao


def notificar_chegada_aos_setores(servicos, por=None):
    """Um e-mail por setor, para quem organiza o setor, com os serviços que chegaram a ele (ADR 0008, 5)."""
    por_setor = {}
    for servico in servicos:
        por_setor.setdefault(servico.setor_id, []).append(servico)

    total = 0
    for itens in por_setor.values():
        setor = itens[0].setor
        destinatarios = [usuario.email for usuario in setor.organizadores() if usuario.email]
        ordens = sorted({servico.ordem_servico_id for servico in itens})
        quantidade = f'{len(itens)} serviço' + ('s' if len(itens) > 1 else '')
        assunto = f'{quantidade} para {setor.nome} - OS ' + ', '.join(f'#{numero}' for numero in ordens)
        contexto = {
            'setor': setor,
            'servicos': itens,
            'link': f'{settings.FRONTEND_URL}/setor/{setor.id}',
        }
        total += _enviar(assunto, 'emails/servicos_chegaram.html', contexto, destinatarios, excluir=por)
    return total


def notificar_distribuicao(tarefas, por=None):
    """Um e-mail por responsável com as tarefas que ele recebeu nesta ação: uma distribuição com várias tarefas
    para a mesma pessoa vira um e-mail só."""
    por_responsavel = {}
    for tarefa in tarefas:
        if tarefa.responsavel_id:
            por_responsavel.setdefault(tarefa.responsavel_id, []).append(tarefa)

    total = 0
    for itens in por_responsavel.values():
        responsavel = itens[0].responsavel
        if not responsavel.is_active or not responsavel.email:
            continue
        ordens = sorted({tarefa.servico.ordem_servico_id for tarefa in itens})
        if len(itens) == 1:
            assunto = f'Nova tarefa para você - OS #{ordens[0]}'
        else:
            assunto = f'{len(itens)} tarefas novas para você - OS ' + ', '.join(f'#{numero}' for numero in ordens)
        contexto = {
            'responsavel': responsavel,
            'tarefas': [{
                'tarefa': tarefa,
                'servico_nome': _nome_do_servico(tarefa.servico),
                'prioridade_cor': CORES_PRIORIDADE.get(tarefa.prioridade, '#64748B'),
            } for tarefa in itens],
            'link': f'{settings.FRONTEND_URL}/meus-servicos',
        }
        total += _enviar(assunto, 'emails/tarefa_atribuida.html', contexto, [responsavel.email], excluir=por)
    return total


def notificar_atribuicao_tarefa(tarefa, por=None):
    """Tarefa criada ou reatribuída fora da distribuição em lote (ex.: troca de responsável)."""
    return notificar_distribuicao([tarefa], por=por)


def notificar_liberacao_cobranca(instancia, tipo, valor=None, por=None, execucao=None):
    # Quem pode registrar a cobrança é quem precisa saber que ela foi liberada.
    destinatarios = _emails_com_permissao(Permissao.FINANCEIRO_REGISTRAR_COBRANCA)
    if not destinatarios:
        return 0

    assunto = f'{tipo} #{instancia.pk} liberada para cobrança'
    contexto = {
        'tipo': tipo,
        'numero': instancia.pk,
        'cliente': instancia.cliente,
        'valor': valor,
        'liberada_em': getattr(instancia, 'liberada_para_cobranca_em', None) or getattr(instancia, 'data_liberacao_cobranca', None),
        'liberada_por': _nome_usuario(
            getattr(instancia, 'liberada_para_cobranca_por', None) or getattr(instancia, 'liberada_cobranca_por', None)
        ),
        'execucao': execucao,
        'link': f'{settings.FRONTEND_URL}/cobrancas/{instancia.pk}' if tipo == 'OS' else None,
    }
    return _enviar(assunto, 'emails/liberacao_cobranca.html', contexto, destinatarios, excluir=por)


def resumo_da_execucao(ordem):
    """O que vai junto com a liberação da OS: quantos dias ela levou da venda à liberação, a média de dias por
    serviço e quem trabalhou nela, com atribuição, início, término e dias parada (da atribuição ao início) de
    cada tarefa. None se nada foi executado (ex.: liberada na venda)."""
    from apps.ordens_servico.models import Tarefa
    from apps.ordens_servico.models.servico import StatusServico
    from apps.ordens_servico.models.tarefa import StatusTarefa

    tarefas = list(
        Tarefa.objects.filter(servico__ordem_servico=ordem)
        .exclude(status=StatusTarefa.CANCELADA)
        .exclude(servico__status=StatusServico.CANCELADO)
        .select_related('responsavel', 'servico__catalogo')
        .order_by('servico_id', 'data_inicio', 'id')
    )
    if not any(tarefa.status == StatusTarefa.CONCLUIDA for tarefa in tarefas):
        return None

    linhas = []
    for tarefa in tarefas:
        atribuida = tarefa.atribuida_em.date() if tarefa.atribuida_em else None
        linhas.append({
            'pessoa': _nome_usuario(tarefa.responsavel),
            'servico': _nome_do_servico(tarefa.servico),
            'atribuida_em': atribuida,
            'data_inicio': tarefa.data_inicio,
            'data_termino': tarefa.data_termino,
            'dias_parada': (tarefa.data_inicio - atribuida).days if atribuida and tarefa.data_inicio else None,
            'dias_execucao': (
                (tarefa.data_termino - tarefa.data_inicio).days if tarefa.data_inicio and tarefa.data_termino else None
            ),
        })

    duracoes = [
        (servico.data_termino - servico.data_inicio).days
        for servico in ordem.servicos.exclude(status=StatusServico.CANCELADO)
        if servico.data_inicio and servico.data_termino
    ]
    liberada = ordem.liberada_para_cobranca_em
    return {
        'dias_venda_ate_liberacao': (
            (liberada.date() - ordem.criada_em.date()).days if liberada and ordem.criada_em else None
        ),
        'media_dias_por_servico': round(sum(duracoes) / len(duracoes), 1) if duracoes else None,
        'pessoas': sorted({linha['pessoa'] for linha in linhas if linha['pessoa']}),
        'tarefas': linhas,
    }


def notificar_venda_faturada(ordem, por=None):
    """O faturamento fecha o ciclo da venda: avisa só o vendedor (quem registrou a venda)."""
    vendedor = ordem.criado_por
    if not vendedor or not vendedor.is_active or not vendedor.email:
        return 0

    assunto = f'OS #{ordem.pk} - faturada'
    contexto = {
        'tipo': 'OS',
        'numero': ordem.pk,
        'cliente': ordem.cliente,
        'valor': ordem.valor,
        'referencia_rotulo': 'Referência do lançamento',
        'referencia': ordem.referencia_lancamento,
        'data_cobranca': ordem.data_cobranca,
        'realizada_por': _nome_usuario(ordem.cobranca_realizada_por),
        'link': f'{settings.FRONTEND_URL}/vendas/{ordem.pk}',
    }
    return _enviar(assunto, 'emails/cobranca_realizada.html', contexto, [vendedor.email], excluir=por)


def notificar_cobranca_realizada(instancia, tipo, valor=None):
    # Quem vê valores e cuida da venda (os.gerenciar) ou da cobrança.
    destinatarios = [
        u.email for u in _usuarios_ativos()
        if tem_permissao(u, Permissao.FINANCEIRO_VER_VALORES) and (
            tem_permissao(u, Permissao.OS_GERENCIAR) or tem_permissao(u, Permissao.FINANCEIRO_REGISTRAR_COBRANCA)
        )
    ]
    if not destinatarios:
        return 0

    assunto = f'{tipo} #{instancia.pk} - cobrança realizada'
    contexto = {
        'tipo': tipo,
        'numero': instancia.pk,
        'cliente': instancia.cliente,
        'valor': valor,
        # OS: referência do lançamento no sistema externo. OS operacional: número da NF.
        'referencia_rotulo': 'Referência do lançamento' if hasattr(instancia, 'referencia_lancamento') else 'Número da NF',
        'referencia': getattr(instancia, 'referencia_lancamento', None) or getattr(instancia, 'numero_nf', None),
        'data_cobranca': getattr(instancia, 'data_cobranca', None),
        'realizada_por': _nome_usuario(instancia.cobranca_realizada_por),
    }
    return _enviar(assunto, 'emails/cobranca_realizada.html', contexto, destinatarios)


def notificar_resumo_diario(usuario, setores, a_faturar):
    """Resumo diário de pendências de uma pessoa (ADR 0010). Só sai se houver pendência."""
    if not usuario.email or not (setores or a_faturar):
        return 0
    total = sum(len(bloco['sem_distribuir']) + len(bloco['parados']) for bloco in setores) + len(a_faturar)
    assunto = f'Resumo do dia: {total} pendência' + ('s' if total > 1 else '')
    contexto = {
        'usuario': usuario,
        'setores': setores,
        'a_faturar': a_faturar,
        'dias_sem_distribuir': settings.DIAS_CONFERENCIA_SEM_DISTRIBUIR,
        'dias_sem_movimentacao': settings.DIAS_ALERTA_SEM_MOVIMENTACAO,
        'dias_sem_lancamento': settings.DIAS_ALERTA_SEM_LANCAMENTO,
        'link': settings.FRONTEND_URL,
    }
    return _enviar(assunto, 'emails/resumo_diario.html', contexto, [usuario.email])


def _nome_usuario(usuario):
    if not usuario:
        return None
    return usuario.nome_completo or usuario.email
