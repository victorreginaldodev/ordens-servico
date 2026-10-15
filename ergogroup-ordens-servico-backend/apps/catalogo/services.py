"""Setor dos catálogos (revisão de permissões e setores, P5).

O serviço vendido guarda uma cópia do setor do catálogo (`Servico.setor`): mudar o catálogo de setor não move o
que já foi vendido. Quem muda o setor escolhe se os serviços em aberto ainda sem tarefas (novos ou a distribuir)
vão junto; os que já têm tarefas ficam, porque os responsáveis são do setor antigo.
"""
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Subquery
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError


def _abertos_sem_tarefas():
    from apps.ordens_servico.models import Servico, Tarefa
    from apps.ordens_servico.models.servico import StatusServico

    return Servico.objects.filter(status=StatusServico.ABERTO).exclude(
        Exists(Tarefa.objects.filter(servico=OuterRef('pk'))),
    )


def servicos_que_podem_mudar(catalogos):
    """Serviços abertos, ainda sem tarefas, dos catálogos informados (objetos, IDs ou queryset)."""
    return _abertos_sem_tarefas().filter(catalogo__in=catalogos)


def com_servicos_em_aberto(queryset):
    """Anota `servicos_em_aberto` nos catálogos: quantos serviços mudariam de setor junto com o catálogo."""
    contagem = (
        _abertos_sem_tarefas().filter(catalogo=OuterRef('pk')).order_by().values('catalogo')
        .annotate(total=Count('pk')).values('total')
    )
    return queryset.annotate(servicos_em_aberto=Coalesce(Subquery(contagem), 0))


def validar_setor_que_recebe(setor):
    """Catálogo ativo só aponta para setor com quem receba tarefas: senão o serviço vendido não teria a quem ir."""
    if not setor.recebedores().exists():
        raise ValidationError({'setor': (
            f'O setor "{setor}" ainda não tem quem receba tarefas. Dê a alguém uma função com "Recebe tarefas" '
            'neste setor, ou marque "Também executa em" na pessoa, antes de pôr catálogos ativos nele.'
        )})


def motivo_para_nao_desativar_o_setor(setor):
    """Setor com catálogos ativos não é desativado (revisão do catálogo, item 2): os serviços vendidos desses
    catálogos iriam para um setor sem ninguém. Devolve a mensagem, ou `None` quando pode desativar."""
    catalogos = setor.catalogos.filter(ativo=True).count()
    if not catalogos:
        return None
    plural = 's' if catalogos > 1 else ''
    return (
        f'O setor "{setor}" executa {catalogos} catálogo{plural} ativo{plural}. Passe-os a outro setor (ou '
        'desative-os) no Catálogo antes de desativar o setor.'
    )


def aviso_de_setor_sem_quem_receba(setor):
    return (
        f'O setor "{setor}" executa catálogos ativos, mas ficou sem quem receba tarefas. Os serviços vendidos '
        'para ele vão chegar sem ninguém para executá-los: dê a alguém uma função com "Recebe tarefas" neste setor, '
        'ou marque "Também executa em" na pessoa.'
    )


def avisos_da_venda(servicos):
    """A venda não para por causa do setor (o comercial não tem como corrigi-lo), mas avisa quando algum serviço
    foi para um setor sem quem receba as tarefas. O mesmo aparece em Setores ("sem quem receba")."""
    setores = {servico.setor_id: servico.setor for servico in servicos if servico.setor_id}
    return [
        f'O setor "{setor}" não tem quem receba tarefas agora: o serviço foi registrado, mas fica parado até '
        'alguém do setor poder recebê-lo. Avise quem cuida do time.'
        for setor in setores.values() if not setor.recebedores().exists()
    ]


def setores_sem_quem_receba():
    """Setores ativos com catálogos ativos e ninguém que receba as tarefas, por ID."""
    from apps.organizacoes.models import Setor

    setores = Setor.objects.filter(ativo=True, catalogos__ativo=True).distinct()
    return {setor.pk: setor for setor in setores if not setor.recebedores().exists()}


def avisos_de_setores_que_ficaram_sem_quem_receba(antes):
    """Compara com a foto `antes` (de `setores_sem_quem_receba`): mudar vínculos, funções ou pessoas não é barrado
    por isso (desligar alguém não pode depender do catálogo), mas quem mudou fica sabendo."""
    depois = setores_sem_quem_receba()
    return [aviso_de_setor_sem_quem_receba(setor) for pk, setor in depois.items() if pk not in antes]


def motivo_para_nao_trocar_o_catalogo(servico, catalogo):
    """Trocar o catálogo de um serviço já vendido (revisão do catálogo, item 3). No mesmo setor, sempre pode. Para
    outro setor, só o serviço em aberto e ainda sem tarefas, como na mudança de setor do catálogo: as tarefas têm
    responsáveis do setor atual. Devolve a mensagem, ou `None` quando pode trocar."""
    from apps.ordens_servico.models.servico import StatusServico

    if catalogo.pk == servico.catalogo_id or catalogo.setor_id == servico.setor_id:
        return None
    if servico.tarefas.exists():
        return (
            f'Este serviço já tem tarefas no setor "{servico.setor}", então só pode trocar por um catálogo do mesmo '
            f'setor. Para levá-lo ao setor "{catalogo.setor}", acrescente à venda um serviço novo com este catálogo.'
        )
    if servico.status != StatusServico.ABERTO:
        return 'Só um serviço em aberto pode passar para um catálogo de outro setor.'
    return None


def mover_servicos_em_aberto(catalogos, setor):
    """Leva para `setor` os serviços em aberto e sem tarefas dos catálogos. O recebimento volta a zero: o setor
    novo precisa confirmar que recebeu (ADR 0009), e quem o organiza recebe o aviso de chegada."""
    from apps.auditoria.models import AcaoAuditoria
    from apps.auditoria.utils import registrar_update_direto
    from apps.ordens_servico.models import Servico
    from apps.ordens_servico.services.venda import avisar_chegada

    movidos = list(servicos_que_podem_mudar(catalogos).exclude(setor=setor).select_related('setor'))
    for servico in movidos:
        updates = {'setor_id': setor.pk, 'recebido_em': None, 'recebido_por_id': None}
        registrar_update_direto(
            servico, updates, acao=AcaoAuditoria.ATUALIZACAO,
            motivo=f'Catálogo passou para o setor "{setor}": serviço em aberto movido junto.',
        )
        Servico.objects.filter(pk=servico.pk).update(**updates)
        servico.setor, servico.recebido_em, servico.recebido_por_id = setor, None, None
        servico.registrar_movimentacao()
    avisar_chegada(movidos)
    return len(movidos)


@transaction.atomic
def mudar_setor_dos_catalogos(catalogos, setor, mover_servicos=False):
    """Muda o setor de vários catálogos de uma vez. Devolve `(catalogos alterados, servicos movidos)`."""
    from apps.catalogo.models import Catalogo

    if not setor.ativo:
        raise ValidationError({'setor': 'Escolha um setor ativo.'})
    catalogos = list(catalogos)
    if any(catalogo.ativo for catalogo in catalogos):
        validar_setor_que_recebe(setor)
    alterados = [catalogo for catalogo in catalogos if catalogo.setor_id != setor.pk]
    Catalogo.objects.filter(pk__in=[catalogo.pk for catalogo in alterados]).update(setor=setor)
    movidos = mover_servicos_em_aberto(catalogos, setor) if mover_servicos else 0
    return len(alterados), movidos
