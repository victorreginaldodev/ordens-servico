from collections import Counter

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return _resposta_exclusao_bloqueada(exc, context)
    return drf_exception_handler(exc, context)


def _resposta_exclusao_bloqueada(exc, context):
    # ProtectedError é levantado pelo Collector do Django quando uma FK com
    # on_delete=PROTECT aponta para o objeto. Sem este tratamento o DRF devolve 500.
    contagem = Counter(obj._meta.model for obj in exc.protected_objects)
    vinculos = [
        {
            'modelo': modelo._meta.model_name,
            'descricao': str(modelo._meta.verbose_name if qtd == 1 else modelo._meta.verbose_name_plural).lower(),
            'quantidade': qtd,
        }
        for modelo, qtd in sorted(contagem.items(), key=lambda item: item[0]._meta.model_name)
    ]
    resumo = ', '.join(f"{v['quantidade']} {v['descricao']}" for v in vinculos)
    detail = f'Não é possível excluir este registro porque ele está vinculado a: {resumo}.'

    dica = getattr(context.get('view'), 'dica_exclusao_bloqueada', None)
    if dica:
        detail = f'{detail} {dica}'

    return Response({'detail': detail, 'vinculos': vinculos}, status=status.HTTP_409_CONFLICT)
