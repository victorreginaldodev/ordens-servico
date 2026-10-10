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


def _usuarios_ativos():
    return Usuario.objects.filter(is_active=True).exclude(email='')


def _emails_com_permissao(permissao):
    return [u.email for u in _usuarios_ativos() if tem_permissao(u, permissao)]


def _enviar(assunto, template, contexto, destinatarios):
    if not settings.EMAIL_NOTIFICATIONS_ENABLED:
        return 0

    destinatarios = list(dict.fromkeys(destinatarios))
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


def notificar_chegada_aos_setores(servicos):
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
            'link': f'{settings.FRONTEND_URL}/ordens/{ordens[0]}' if len(ordens) == 1 else settings.FRONTEND_URL,
        }
        total += _enviar(assunto, 'emails/servicos_chegaram.html', contexto, destinatarios)
    return total


def notificar_atribuicao_tarefa(tarefa):
    responsavel = tarefa.responsavel
    if not responsavel or not responsavel.email:
        return 0

    assunto = f'Nova tarefa atribuída a você - Tarefa #{tarefa.pk}'
    contexto = {
        'tarefa': tarefa,
        'prioridade_cor': CORES_PRIORIDADE.get(tarefa.prioridade, '#64748B'),
    }
    return _enviar(assunto, 'emails/tarefa_atribuida.html', contexto, [responsavel.email])


def notificar_liberacao_cobranca(instancia, tipo, valor=None):
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
    }
    return _enviar(assunto, 'emails/liberacao_cobranca.html', contexto, destinatarios)


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


def _nome_usuario(usuario):
    if not usuario:
        return None
    return usuario.nome_completo or usuario.email
