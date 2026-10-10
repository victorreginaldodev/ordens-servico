from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.ordens_servico.emails import (
    notificar_atribuicao_tarefa,
    notificar_cobranca_realizada,
    notificar_liberacao_cobranca,
)
from apps.ordens_servico.models import OrdemServico, OrdemServicoOperacional, Tarefa


@receiver(pre_save, sender=Tarefa)
def _cachear_responsavel_anterior_tarefa(sender, instance, **kwargs):
    instance._responsavel_anterior_id = (
        Tarefa.objects.filter(pk=instance.pk).values_list('responsavel_id', flat=True).first()
        if instance.pk else None
    )


@receiver(post_save, sender=Tarefa)
def enviar_email_atribuicao_tarefa(sender, instance, created, **kwargs):
    anterior_id = getattr(instance, '_responsavel_anterior_id', None)
    if not created and anterior_id == instance.responsavel_id:
        return

    transaction.on_commit(lambda: notificar_atribuicao_tarefa(instance))


@receiver(pre_save, sender=OrdemServico)
def _cachear_cobranca_realizada_anterior_os(sender, instance, **kwargs):
    instance._cobranca_realizada_anterior = (
        OrdemServico.objects.filter(pk=instance.pk).values_list('cobranca_realizada', flat=True).first()
        if instance.pk else False
    )


@receiver(post_save, sender=OrdemServico)
def enviar_email_cobranca_realizada_os(sender, instance, created, **kwargs):
    anterior = getattr(instance, '_cobranca_realizada_anterior', False)
    if created or anterior or not instance.cobranca_realizada:
        return

    transaction.on_commit(
        lambda: notificar_cobranca_realizada(instance, tipo='OS', valor=instance.valor)
    )


@receiver(pre_save, sender=OrdemServicoOperacional)
def _cachear_cobranca_anterior_oso(sender, instance, **kwargs):
    anterior = (
        OrdemServicoOperacional.objects
        .filter(pk=instance.pk)
        .values('data_liberacao_cobranca', 'cobranca_realizada')
        .first()
        if instance.pk else None
    )
    instance._liberacao_anterior = anterior['data_liberacao_cobranca'] if anterior else None
    instance._cobranca_realizada_anterior = anterior['cobranca_realizada'] if anterior else False


@receiver(post_save, sender=OrdemServicoOperacional)
def enviar_email_cobranca_oso(sender, instance, created, **kwargs):
    liberacao_anterior = getattr(instance, '_liberacao_anterior', None)
    cobranca_anterior = getattr(instance, '_cobranca_realizada_anterior', False)

    if liberacao_anterior is None and instance.data_liberacao_cobranca is not None:
        transaction.on_commit(
            lambda: notificar_liberacao_cobranca(instance, tipo='OS Operacional')
        )

    if not cobranca_anterior and instance.cobranca_realizada:
        transaction.on_commit(
            lambda: notificar_cobranca_realizada(instance, tipo='OS Operacional')
        )
