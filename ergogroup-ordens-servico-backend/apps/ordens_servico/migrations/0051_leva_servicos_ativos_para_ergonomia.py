"""Correção única pedida pelo usuário em 16/10/2026. Em produção, os catálogos de Ergonomia já foram passados para o
setor Ergonomia, mas os serviços ativos vendidos antes continuaram em Segurança do Trabalho: o serviço guarda uma
cópia do setor e, até então, só os abertos e sem tarefas podiam ir junto, e só marcando a opção.

Leva para Ergonomia os serviços ativos dos catálogos que hoje são de Ergonomia e que estão em outro setor, com as
mesmas regras da tela do catálogo (`mover_servicos` em `apps/catalogo/services.py`):
- em aberto e sem tarefas: vão e voltam a "novo" (recebimento zerado, movimentação registrada);
- distribuídos ou em andamento: vão com as tarefas e os responsáveis, sem mexer no recebimento.
Concluídos e cancelados ficam no setor que fez o trabalho. Cada serviço movido ganha um registro na auditoria (origem
`sistema`, para aparecer na linha do tempo). Não envia e-mails. Sem o setor Ergonomia, não faz nada."""
from datetime import date, datetime
from decimal import Decimal

from django.db import migrations
from django.db.models import Exists, OuterRef
from django.utils import timezone

ORGANIZACAO = 'Ergogroup'
SETOR = 'Ergonomia'
ATIVOS = ('aberto', 'em_andamento')


def _valor(valor):
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return str(valor)
    return valor


def _snapshot(servico):
    return {campo.attname: _valor(getattr(servico, campo.attname)) for campo in servico._meta.concrete_fields}


def levar(apps, schema_editor):
    Setor = apps.get_model('organizacoes', 'Setor')
    Servico = apps.get_model('ordens_servico', 'Servico')
    Tarefa = apps.get_model('ordens_servico', 'Tarefa')
    RegistroAuditoria = apps.get_model('auditoria', 'RegistroAuditoria')

    setor = Setor.objects.filter(organizacao__nome=ORGANIZACAO, nome=SETOR).first()
    if setor is None:
        print(f'\n  Setor "{SETOR}" não existe: nenhum serviço movido.')
        return

    servicos = (
        Servico.objects.filter(catalogo__setor=setor, status__in=ATIVOS)
        .exclude(setor=setor)
        .annotate(tem_tarefas=Exists(Tarefa.objects.filter(servico=OuterRef('pk'))))
        .order_by('pk')
    )
    abertos, distribuidos = 0, 0
    for servico in servicos:
        em_aberto = servico.status == 'aberto' and not servico.tem_tarefas
        antes = _snapshot(servico)
        updates = {'setor_id': setor.pk}
        if em_aberto:
            updates.update(recebido_em=None, recebido_por_id=None)
        Servico.objects.filter(pk=servico.pk).update(**updates)
        for campo, valor in updates.items():
            setattr(servico, campo, valor)
        depois = _snapshot(servico)
        if em_aberto:
            motivo = f'Serviço em aberto levado ao setor "{SETOR}", responsável pelo catálogo: volta a "novo".'
            Servico.objects.filter(pk=servico.pk).update(ultima_movimentacao_em=timezone.now())
            abertos += 1
        else:
            motivo = f'Serviço distribuído levado ao setor "{SETOR}", responsável pelo catálogo, com as tarefas.'
            distribuidos += 1
        RegistroAuditoria.objects.create(
            entidade='servico',
            objeto_id=servico.pk,
            objeto_repr=f'Serviço #{servico.pk} — OS #{servico.ordem_servico_id}',
            acao='atualizacao',
            origem='sistema',
            motivo=f'{motivo} (correção única, migração 0051)',
            alteracoes={
                campo: {'antes': antes[campo], 'depois': depois[campo]}
                for campo in depois if antes[campo] != depois[campo]
            },
            snapshot=depois,
            ordem_servico_id=servico.ordem_servico_id,
            servico_id=servico.pk,
        )

    print(f'\n  Levados para {SETOR}: {abertos} em aberto (voltam a "novo") e {distribuidos} distribuídos ou em '
          'andamento (com as tarefas).')


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0050_preenche_atribuida_em'),
        ('catalogo', '0008_catalogo_setor_obrigatorio'),
        ('organizacoes', '0022_gestor_tecnico_sem_ver_valores'),
        ('auditoria', '0005_acao_recebimento'),
    ]

    operations = [
        migrations.RunPython(levar, migrations.RunPython.noop),
    ]
