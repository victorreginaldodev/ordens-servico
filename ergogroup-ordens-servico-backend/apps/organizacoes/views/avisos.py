"""Aviso de setor que ficou sem quem receba tarefas (revisão do catálogo, item 2).

Mudar vínculo, função, "também executa em" ou desativar uma pessoa nunca é barrado por isso: desligar ou transferir
alguém não pode depender do catálogo. A resposta só traz `avisos` com os setores que executam catálogos ativos e
deixaram de ter quem receba as tarefas por causa desta mudança.
"""
from apps.catalogo.services import avisos_de_setores_que_ficaram_sem_quem_receba, setores_sem_quem_receba


def com_avisos_de_quem_recebe(executar):
    """Executa `executar()` (que devolve um `Response`) e acrescenta `avisos` ao corpo, quando ele é um dicionário."""
    antes = setores_sem_quem_receba()
    response = executar()
    if isinstance(response.data, dict):
        response.data['avisos'] = avisos_de_setores_que_ficaram_sem_quem_receba(antes)
    return response


class AvisaSetorSemQuemRecebeMixin:
    """Acrescenta `avisos` às respostas de criar e editar do viewset."""

    def create(self, request, *args, **kwargs):
        return com_avisos_de_quem_recebe(lambda: super(AvisaSetorSemQuemRecebeMixin, self).create(request, *args, **kwargs))

    def update(self, request, *args, **kwargs):
        return com_avisos_de_quem_recebe(lambda: super(AvisaSetorSemQuemRecebeMixin, self).update(request, *args, **kwargs))
