import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def enviar_email_recuperacao_senha(usuario, reset_url: str) -> bool:
    """
    Envia o e-mail com o link para redefinição de senha do usuário.
    Este e-mail é transacional (solicitado diretamente pelo usuário) e não
    depende do interruptor EMAIL_NOTIFICATIONS_ENABLED.
    """
    if not usuario.email:
        logger.warning("Tentativa de envio de recuperação de senha para usuário sem e-mail: %s", usuario.id)
        return False

    assunto = "Redefinição de Senha — ErgoGroup"
    contexto = {
        'usuario': usuario,
        'reset_url': reset_url,
    }

    try:
        html_content = render_to_string('emails/recuperacao_senha.html', contexto)
        text_content = (
            f"Olá, {usuario.nome_completo or usuario.email}.\n\n"
            f"Recebemos uma solicitação para redefinir a senha da sua conta no ErgoGroup.\n\n"
            f"Acesse o link abaixo para criar sua nova senha:\n"
            f"{reset_url}\n\n"
            f"Se você não solicitou a alteração, por favor ignore esta mensagem.\n\n"
            f"Atenciosamente,\nEquipe ErgoGroup"
        )

        email = EmailMultiAlternatives(
            subject=assunto,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[usuario.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        logger.info("E-mail de redefinição de senha enviado com sucesso para %s", usuario.email)
        return True
    except Exception as exc:
        logger.exception("Falha ao enviar e-mail de redefinição de senha para %s: %s", usuario.email, exc)
        return False
