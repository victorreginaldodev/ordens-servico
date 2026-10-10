from contextlib import contextmanager
from threading import local


_state = local()


def get_auditoria_context():
    return getattr(_state, 'context', {})


def usuario_do_contexto(contexto):
    """O usuário explícito do contexto ou, numa requisição, o autenticado nela. O DRF copia para a requisição do
    Django o usuário que autenticou (inclusive por JWT), então ele já está lá quando o registro é gravado."""
    if contexto.get('usuario') is not None:
        return contexto['usuario']
    requisicao = contexto.get('requisicao')
    usuario = getattr(requisicao, 'user', None)
    return usuario if usuario is not None and usuario.is_authenticated else None


def set_auditoria_context(**context):
    _state.context = context


def clear_auditoria_context():
    if hasattr(_state, 'context'):
        delattr(_state, 'context')


@contextmanager
def auditoria_context(**context):
    anterior = get_auditoria_context()
    set_auditoria_context(**{**anterior, **context})
    try:
        yield
    finally:
        set_auditoria_context(**anterior)
