from uuid import uuid4

from apps.auditoria.context import clear_auditoria_context, set_auditoria_context


class AuditoriaContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # O usuário não é lido aqui: com JWT, a autenticação só acontece dentro da view do DRF, depois deste
        # middleware. Guardamos a requisição e o usuário é resolvido na hora de gravar o registro.
        set_auditoria_context(
            requisicao=request,
            origem='api',
            request_id=request.headers.get('X-Request-ID') or uuid4().hex,
            ip=_get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        try:
            return self.get_response(request)
        finally:
            clear_auditoria_context()


def _get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
