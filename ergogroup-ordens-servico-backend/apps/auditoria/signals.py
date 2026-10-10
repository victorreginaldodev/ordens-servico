from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver

from apps.auditoria.models import AcaoAuditoria
from apps.auditoria.utils import (
    classificar_acao,
    diff_snapshots,
    entidade_do_modelo,
    registrar_evento_modelo,
    snapshot_modelo,
)
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa, OrdemServicoOperacional


MODELOS_AUDITADOS = (OrdemServico, Servico, Tarefa, OrdemServicoOperacional)


@receiver(pre_save)
def guardar_estado_anterior(sender, instance, **kwargs):
    if sender not in MODELOS_AUDITADOS or not instance.pk:
        return
    anterior = sender.objects.filter(pk=instance.pk).first()
    if anterior:
        instance._auditoria_snapshot_anterior = snapshot_modelo(anterior)


@receiver(post_save)
def auditar_save(sender, instance, created, **kwargs):
    if sender not in MODELOS_AUDITADOS:
        return

    snapshot = snapshot_modelo(instance)
    entidade = entidade_do_modelo(instance)
    if created:
        registrar_evento_modelo(
            instance,
            AcaoAuditoria.CRIACAO,
            alteracoes={campo: {'antes': None, 'depois': valor} for campo, valor in snapshot.items()},
            snapshot=snapshot,
        )
        return

    anterior = getattr(instance, '_auditoria_snapshot_anterior', None)
    if not anterior:
        return
    alteracoes = diff_snapshots(anterior, snapshot)
    if not alteracoes:
        return
    registrar_evento_modelo(
        instance,
        classificar_acao(entidade, alteracoes),
        alteracoes=alteracoes,
        snapshot=snapshot,
    )


@receiver(pre_delete)
def auditar_delete(sender, instance, **kwargs):
    if sender not in MODELOS_AUDITADOS:
        return
    registrar_evento_modelo(
        instance,
        AcaoAuditoria.EXCLUSAO,
        snapshot=snapshot_modelo(instance),
    )
