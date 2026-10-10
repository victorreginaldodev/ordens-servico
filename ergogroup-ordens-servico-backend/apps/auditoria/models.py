from django.conf import settings
from django.db import models


class EntidadeAuditada(models.TextChoices):
    ORDEM_SERVICO = 'ordem_servico', 'Ordem de Serviço'
    SERVICO = 'servico', 'Serviço'
    TAREFA = 'tarefa', 'Tarefa'
    MINI_OS = 'mini_os', 'OS Operacional'


class AcaoAuditoria(models.TextChoices):
    CRIACAO = 'criacao', 'Criação'
    ATUALIZACAO = 'atualizacao', 'Atualização'
    EXCLUSAO = 'exclusao', 'Exclusão'
    STATUS = 'status', 'Mudança de Status'
    PROPAGACAO_STATUS = 'propagacao_status', 'Propagação de Status'
    # Mantidos para preservar o rótulo de exibição de registros históricos —
    # não são mais emitidos por classificar_acao() após o domínio faturamento
    # virar cobranca (ver LIBERACAO_COBRANCA e COBRANCA_REALIZADA).
    LIBERACAO_FATURAMENTO = 'liberacao_faturamento', 'Liberação para Faturamento'
    FATURAMENTO = 'faturamento', 'Faturamento'
    LIBERACAO_COBRANCA = 'liberacao_cobranca', 'Liberação de Cobrança'
    COBRANCA_REALIZADA = 'cobranca_realizada', 'Cobrança Realizada'
    # Mantido para o rótulo de registros históricos: o contrato da OS foi substituído pelo recorrente.
    CONTRATO = 'contrato', 'Contrato'
    CIENCIA_ALERTA = 'ciencia_alerta', 'Ciência de alerta'
    BACKFILL = 'backfill', 'Backfill'


class OrigemAuditoria(models.TextChoices):
    API = 'api', 'API'
    ADMIN = 'admin', 'Admin'
    SISTEMA = 'sistema', 'Sistema'
    MIGRACAO = 'migracao', 'Migração'


class RegistroAuditoria(models.Model):
    entidade = models.CharField(max_length=30, choices=EntidadeAuditada.choices)
    objeto_id = models.PositiveBigIntegerField()
    objeto_repr = models.CharField(max_length=255, blank=True, default='')

    acao = models.CharField(max_length=40, choices=AcaoAuditoria.choices)
    origem = models.CharField(max_length=20, choices=OrigemAuditoria.choices, default=OrigemAuditoria.SISTEMA)
    motivo = models.TextField(null=True, blank=True)

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_auditoria',
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    alteracoes = models.JSONField(default=dict, blank=True)
    snapshot = models.JSONField(default=dict, blank=True)

    ordem_servico_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    servico_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    tarefa_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    mini_os_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)

    request_id = models.CharField(max_length=64, null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-criado_em', '-id']
        verbose_name = 'Registro de Auditoria'
        verbose_name_plural = 'Registros de Auditoria'
        indexes = [
            models.Index(fields=['entidade', 'objeto_id', '-criado_em']),
            models.Index(fields=['acao', '-criado_em']),
        ]

    def __str__(self):
        return f'{self.get_entidade_display()} #{self.objeto_id} - {self.get_acao_display()}'
