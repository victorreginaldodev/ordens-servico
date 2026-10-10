"""Registro da venda: a OS com os serviços vendidos, numa transação só, e o aviso de chegada aos setores
(ADR 0008, 5)."""
from django.db import transaction

from apps.ordens_servico.models import OrdemServico, Servico


def avisar_chegada(servicos):
    """Agenda, para o fim da transação, um e-mail por setor com os serviços que chegaram a ele."""
    from apps.ordens_servico.emails import notificar_chegada_aos_setores

    servicos = [servico for servico in servicos if servico.setor_id]
    if servicos:
        transaction.on_commit(lambda: notificar_chegada_aos_setores(servicos))


@transaction.atomic
def registrar_venda(dados_da_os, servicos):
    """Cria a OS e os serviços vendidos. Sem prioridade informada, o serviço herda a da OS."""
    ordem = OrdemServico.objects.create(**dados_da_os)
    criados = [
        Servico.objects.create(ordem_servico=ordem, **{'prioridade': ordem.prioridade, **item})
        for item in servicos
    ]
    avisar_chegada(criados)
    return ordem
