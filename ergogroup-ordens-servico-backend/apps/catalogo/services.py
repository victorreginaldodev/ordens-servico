"""Setor dos catálogos (revisão de permissões e setores, P5; revisão de 16/10/2026).

O serviço vendido guarda uma cópia do setor do catálogo (`Servico.setor`): mudar o catálogo de setor não move
sozinho o que já foi vendido. Quem muda o setor escolhe, em duas caixas, o que vai junto:
- os serviços em aberto, ainda sem tarefas (novos ou a distribuir): voltam a "novo" no setor de destino;
- os já distribuídos ou em andamento: vão com as tarefas e os responsáveis como estão.
Os concluídos e cancelados ficam no setor que fez o trabalho. As mesmas caixas trazem para o setor do catálogo os
serviços ativos que ficaram em outro setor numa mudança anterior.
"""
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError


def _ativos():
    from apps.ordens_servico.models import Servico
    from apps.ordens_servico.models.servico import StatusServico

    return Servico.objects.filter(status__in=(StatusServico.ABERTO, StatusServico.EM_ANDAMENTO))


def _tem_tarefas():
    from apps.ordens_servico.models import Tarefa

    return Exists(Tarefa.objects.filter(servico=OuterRef('pk')))


def _em_aberto(servicos):
    """Novos ou a distribuir: abertos e ainda sem tarefas."""
    from apps.ordens_servico.models.servico import StatusServico

    return servicos.filter(status=StatusServico.ABERTO).exclude(_tem_tarefas())


def _com_tarefas(servicos):
    """Distribuídos ou em andamento: os ativos que já têm tarefas."""
    from apps.ordens_servico.models.servico import StatusServico

    return servicos.filter(Q(status=StatusServico.EM_ANDAMENTO) | Q(_tem_tarefas()))


# Contadores do catálogo: cada grupo, no total e só os que estão fora do setor do catálogo.
CONTADORES = {
    'servicos_em_aberto': (_em_aberto, False),
    'servicos_com_tarefas': (_com_tarefas, False),
    'servicos_em_aberto_fora_do_setor': (_em_aberto, True),
    'servicos_com_tarefas_fora_do_setor': (_com_tarefas, True),
}


def com_contagem_de_servicos(queryset):
    """Anota nos catálogos os `CONTADORES`: quantos serviços ativos de cada grupo podem ir junto com o catálogo."""
    anotacoes = {}
    for nome, (grupo, fora_do_setor) in CONTADORES.items():
        servicos = grupo(_ativos()).filter(catalogo=OuterRef('pk'))
        if fora_do_setor:
            servicos = servicos.exclude(setor=OuterRef('setor'))
        contagem = servicos.order_by().values('catalogo').annotate(total=Count('pk')).values('total')
        anotacoes[nome] = Coalesce(Subquery(contagem), 0)
    return queryset.annotate(**anotacoes)


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
    outro setor, só o serviço em aberto e ainda sem tarefas: as tarefas têm responsáveis do setor atual. Devolve a
    mensagem, ou `None` quando pode trocar."""
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


@transaction.atomic
def mover_servicos(catalogos, setor, em_aberto=False, com_tarefas=False):
    """Leva para `setor` os serviços ativos dos catálogos que estão em outro setor, nos grupos escolhidos. Devolve
    quantos foram.
    - Em aberto: o recebimento volta a zero, porque o setor novo precisa confirmar que recebeu (ADR 0009), e quem o
      organiza recebe o aviso de chegada.
    - Com tarefas: vão com as tarefas e os responsáveis; o recebimento e a última movimentação ficam como estavam
      (o trabalho já foi distribuído e não andou com a mudança), e não há aviso de chegada (ADR 0010: só avisa quem
      tem algo a fazer). Quem organiza o setor novo pode redistribuir."""
    from apps.auditoria.models import AcaoAuditoria
    from apps.auditoria.utils import registrar_update_direto
    from apps.ordens_servico.models import Servico
    from apps.ordens_servico.services.venda import avisar_chegada

    servicos = _ativos().filter(catalogo__in=catalogos).exclude(setor=setor).select_related('setor')
    abertos = list(_em_aberto(servicos)) if em_aberto else []
    distribuidos = list(_com_tarefas(servicos)) if com_tarefas else []
    for servico in abertos:
        updates = {'setor_id': setor.pk, 'recebido_em': None, 'recebido_por_id': None}
        registrar_update_direto(
            servico, updates, acao=AcaoAuditoria.ATUALIZACAO,
            motivo=f'Serviço em aberto levado ao setor "{setor}", responsável pelo catálogo: volta a "novo".',
        )
        Servico.objects.filter(pk=servico.pk).update(**updates)
        servico.setor, servico.recebido_em, servico.recebido_por_id = setor, None, None
        servico.registrar_movimentacao()
    for servico in distribuidos:
        updates = {'setor_id': setor.pk}
        registrar_update_direto(
            servico, updates, acao=AcaoAuditoria.ATUALIZACAO,
            motivo=f'Serviço distribuído levado ao setor "{setor}", responsável pelo catálogo, com as tarefas.',
        )
        Servico.objects.filter(pk=servico.pk).update(**updates)
    avisar_chegada(abertos)
    return len(abertos) + len(distribuidos)


@transaction.atomic
def mudar_setor_dos_catalogos(catalogos, setor, mover_em_aberto=False, mover_com_tarefas=False):
    """Muda o setor de vários catálogos de uma vez. Devolve `(catalogos alterados, servicos movidos)`."""
    from apps.catalogo.models import Catalogo

    if not setor.ativo:
        raise ValidationError({'setor': 'Escolha um setor ativo.'})
    catalogos = list(catalogos)
    if any(catalogo.ativo for catalogo in catalogos):
        validar_setor_que_recebe(setor)
    alterados = [catalogo for catalogo in catalogos if catalogo.setor_id != setor.pk]
    Catalogo.objects.filter(pk__in=[catalogo.pk for catalogo in alterados]).update(setor=setor)
    movidos = mover_servicos(catalogos, setor, mover_em_aberto, mover_com_tarefas)
    return len(alterados), movidos
