from django.db import models
from django.db.models import F
from django.utils import timezone

class CatalogoOperacional(models.Model):
    """Catálogo de serviços disponíveis para Ordens de Serviço Operacionais."""
    nome = models.CharField(max_length=50)
    descricao = models.TextField(null=True, blank=True)
    gera_cobranca = models.BooleanField(
        default=False,
        help_text='Indica se novas OS operacionais deste serviço geram cobrança por padrão.',
    )
    clientes_isentos_cobranca = models.ManyToManyField(
        'clientes.Cliente',
        blank=True,
        related_name='catalogos_operacionais_isentos_cobranca',
        help_text='Clientes que não geram cobrança para este serviço, mesmo quando a regra padrão cobra.',
    )

    class Meta:
        ordering = ['nome']
        verbose_name = 'Catálogo Operacional'
        verbose_name_plural = 'Catálogos Operacionais'

    def __str__(self):
        return self.nome

    def gera_cobranca_para(self, cliente) -> bool:
        """A regra comercial: o serviço cobra e o cliente não está entre os isentos."""
        return self.gera_cobranca and not self.clientes_isentos_cobranca.filter(
            pk=getattr(cliente, 'pk', cliente),
        ).exists()

    def reaplicar_regra_de_cobranca(self):
        """Aplica a regra atual às OS operacionais deste serviço ainda não faturadas (ADR 0011, revisão de
        19/10/2026). As já faturadas não mudam.

        - Passou a cobrar: a OSO gera cobrança; se já foi finalizada, é liberada agora para o financeiro.
        - Deixou de cobrar (ou o cliente ficou isento): a OSO não gera cobrança e sai da fila.

        Atualiza direto no banco, sem `save()`: uma mudança no catálogo pode alcançar centenas de OSOs, e a
        liberação pelo `save()` mandaria um e-mail para cada uma. Devolve quantas mudaram em cada sentido.
        """
        from apps.ordens_servico.models import OrdemServicoOperacional
        from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional

        pendentes = OrdemServicoOperacional.objects.filter(catalogo_operacional=self, cobranca_realizada=False)
        isentos = list(self.clientes_isentos_cobranca.values_list('pk', flat=True))
        if self.gera_cobranca:
            cobram = pendentes.exclude(cliente_id__in=isentos)
            nao_cobram = pendentes.filter(cliente_id__in=isentos)
        else:
            cobram = pendentes.none()
            nao_cobram = pendentes

        deixaram = nao_cobram.filter(gera_cobranca=True).update(
            gera_cobranca=False, data_liberacao_cobranca=None, liberada_cobranca_por=None,
        )
        passaram = cobram.filter(gera_cobranca=False).update(gera_cobranca=True)
        liberadas = cobram.filter(
            status=StatusOrdemServicoOperacional.FINALIZADA, data_liberacao_cobranca__isnull=True,
        ).update(data_liberacao_cobranca=timezone.now(), liberada_cobranca_por=F('responsavel'))
        return {'passaram_a_cobrar': passaram, 'deixaram_de_cobrar': deixaram, 'liberadas': liberadas}
