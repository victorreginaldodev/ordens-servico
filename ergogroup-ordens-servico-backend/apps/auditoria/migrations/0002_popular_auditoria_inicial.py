from datetime import date, datetime
from decimal import Decimal

from django.db import migrations


MOTIVO_BACKFILL = (
    'Evento inferido a partir do estado atual do sistema. '
    'Histórico detalhado anterior indisponível.'
)


def serializar(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def snapshot(instance):
    return {
        field.attname: serializar(getattr(instance, field.attname))
        for field in instance._meta.concrete_fields
    }


def alteracao_inferida(campo, valor):
    return {campo: {'antes': None, 'depois': serializar(valor)}}


def criar_registro(RegistroAuditoria, *, entidade, objeto_id, objeto_repr, acao, snap, **ids):
    return RegistroAuditoria(
        entidade=entidade,
        objeto_id=objeto_id,
        objeto_repr=(objeto_repr or '')[:255],
        acao=acao,
        origem='migracao',
        motivo=MOTIVO_BACKFILL,
        alteracoes={campo: {'antes': None, 'depois': valor} for campo, valor in snap.items()},
        snapshot=snap,
        **ids,
    )


def popular_auditoria_inicial(apps, schema_editor):
    # Esta migration é histórica: rodou originalmente contra dados que já
    # existiam antes do sistema de auditoria (backfill único). Num banco
    # novo não há nada pré-existente pra popular, então nos protegemos
    # checando se a tabela já existe antes de tentar usá-la — evita
    # depender da ordem relativa com a migration ordens_servico.0001_initial
    # (que rodaria bem depois cronologicamente desta, então não pode ser
    # declarada como dependency sem violar o histórico de quem já aplicou
    # esta migration há muito tempo).
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = %s",
            ['ordens_servico_ordemservico'],
        )
        if cursor.fetchone()[0] == 0:
            return

    RegistroAuditoria = apps.get_model('auditoria', 'RegistroAuditoria')
    OrdemServico = apps.get_model('ordens_servico', 'OrdemServico')
    Servico = apps.get_model('ordens_servico', 'Servico')
    Tarefa = apps.get_model('ordens_servico', 'Tarefa')
    MiniOS = apps.get_model('ordens_servico', 'OrdemServicoOperacional')

    registros = []

    for ordem in OrdemServico.objects.all().iterator():
        snap = snapshot(ordem)
        registros.append(criar_registro(
            RegistroAuditoria,
            entidade='ordem_servico',
            objeto_id=ordem.pk,
            objeto_repr=f'OS #{ordem.pk}',
            acao='backfill',
            snap=snap,
            ordem_servico_id=ordem.pk,
        ))
        if ordem.status == 'concluida':
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='ordem_servico',
                objeto_id=ordem.pk,
                objeto_repr=f'OS #{ordem.pk}',
                acao='status',
                snap=snap,
                ordem_servico_id=ordem.pk,
            ))
        if ordem.liberada_para_cobranca:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='ordem_servico',
                objeto_id=ordem.pk,
                objeto_repr=f'OS #{ordem.pk}',
                acao='liberacao_cobranca',
                snap=snap,
                ordem_servico_id=ordem.pk,
            ))
        if ordem.cobranca_realizada:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='ordem_servico',
                objeto_id=ordem.pk,
                objeto_repr=f'OS #{ordem.pk}',
                acao='cobranca_realizada',
                snap=snap,
                ordem_servico_id=ordem.pk,
            ))
        if ordem.contrato:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='ordem_servico',
                objeto_id=ordem.pk,
                objeto_repr=f'OS #{ordem.pk}',
                acao='contrato',
                snap=snap,
                ordem_servico_id=ordem.pk,
            ))

    for servico in Servico.objects.all().iterator():
        snap = snapshot(servico)
        registros.append(criar_registro(
            RegistroAuditoria,
            entidade='servico',
            objeto_id=servico.pk,
            objeto_repr=f'Serviço #{servico.pk}',
            acao='backfill',
            snap=snap,
            ordem_servico_id=servico.ordem_servico_id,
            servico_id=servico.pk,
        ))
        if servico.data_inicio:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='servico',
                objeto_id=servico.pk,
                objeto_repr=f'Serviço #{servico.pk}',
                acao='status',
                snap=snap,
                ordem_servico_id=servico.ordem_servico_id,
                servico_id=servico.pk,
            ))
        if servico.status == 'concluida':
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='servico',
                objeto_id=servico.pk,
                objeto_repr=f'Serviço #{servico.pk}',
                acao='status',
                snap=snap,
                ordem_servico_id=servico.ordem_servico_id,
                servico_id=servico.pk,
            ))

    for tarefa in Tarefa.objects.all().iterator():
        snap = snapshot(tarefa)
        registros.append(criar_registro(
            RegistroAuditoria,
            entidade='tarefa',
            objeto_id=tarefa.pk,
            objeto_repr=f'Tarefa #{tarefa.pk}',
            acao='backfill',
            snap=snap,
            ordem_servico_id=tarefa.servico.ordem_servico_id,
            servico_id=tarefa.servico_id,
            tarefa_id=tarefa.pk,
        ))
        if tarefa.data_inicio:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='tarefa',
                objeto_id=tarefa.pk,
                objeto_repr=f'Tarefa #{tarefa.pk}',
                acao='status',
                snap=snap,
                ordem_servico_id=tarefa.servico.ordem_servico_id,
                servico_id=tarefa.servico_id,
                tarefa_id=tarefa.pk,
            ))
        if tarefa.status == 'concluida':
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='tarefa',
                objeto_id=tarefa.pk,
                objeto_repr=f'Tarefa #{tarefa.pk}',
                acao='status',
                snap=snap,
                ordem_servico_id=tarefa.servico.ordem_servico_id,
                servico_id=tarefa.servico_id,
                tarefa_id=tarefa.pk,
            ))

    for mini_os in MiniOS.objects.all().iterator():
        snap = snapshot(mini_os)
        registros.append(criar_registro(
            RegistroAuditoria,
            entidade='mini_os',
            objeto_id=mini_os.pk,
            objeto_repr=f'Mini OS #{mini_os.pk}',
            acao='backfill',
            snap=snap,
            mini_os_id=mini_os.pk,
        ))
        if mini_os.status == 'finalizada':
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='mini_os',
                objeto_id=mini_os.pk,
                objeto_repr=f'Mini OS #{mini_os.pk}',
                acao='status',
                snap=snap,
                mini_os_id=mini_os.pk,
            ))
        if mini_os.gera_cobranca or mini_os.data_liberacao_cobranca:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='mini_os',
                objeto_id=mini_os.pk,
                objeto_repr=f'Mini OS #{mini_os.pk}',
                acao='liberacao_cobranca',
                snap=snap,
                mini_os_id=mini_os.pk,
            ))
        if mini_os.cobranca_realizada:
            registros.append(criar_registro(
                RegistroAuditoria,
                entidade='mini_os',
                objeto_id=mini_os.pk,
                objeto_repr=f'Mini OS #{mini_os.pk}',
                acao='cobranca_realizada',
                snap=snap,
                mini_os_id=mini_os.pk,
            ))

    RegistroAuditoria.objects.bulk_create(registros, batch_size=1000)


class Migration(migrations.Migration):

    dependencies = [
        ('auditoria', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(popular_auditoria_inicial, migrations.RunPython.noop),
    ]
