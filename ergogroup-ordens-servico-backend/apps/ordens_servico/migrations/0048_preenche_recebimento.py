"""Ciência de recebimento retroativa (ADR 0009, 5), decidida em 14/10/2026:
- serviço com tarefas: recebido na criação da primeira tarefa, sem pessoa;
- tarefa em andamento ou concluída: recebida no início (meia-noite local de `data_inicio`) ou, sem início, na criação.
Serviços abertos sem tarefas e tarefas abertas ficam sem ciência (Novo e Nova). Não grava auditoria de ciência."""
from datetime import datetime, time

from django.db import migrations
from django.db.models import Min
from django.utils import timezone


def preencher(apps, schema_editor):
    Servico = apps.get_model('ordens_servico', 'Servico')
    Tarefa = apps.get_model('ordens_servico', 'Tarefa')

    servicos = Servico.objects.filter(recebido_em__isnull=True, tarefas__isnull=False).annotate(
        primeira_tarefa=Min('tarefas__criada_em'),
    ).distinct()
    total_servicos = 0
    for servico in servicos.iterator():
        Servico.objects.filter(pk=servico.pk).update(recebido_em=servico.primeira_tarefa)
        total_servicos += 1

    tarefas = Tarefa.objects.filter(recebida_em__isnull=True, status__in=['em_andamento', 'concluida'])
    total_tarefas = 0
    for tarefa in tarefas.only('pk', 'data_inicio', 'criada_em').iterator():
        if tarefa.data_inicio:
            quando = timezone.make_aware(datetime.combine(tarefa.data_inicio, time.min))
        else:
            quando = tarefa.criada_em
        Tarefa.objects.filter(pk=tarefa.pk).update(recebida_em=quando)
        total_tarefas += 1

    print(f'\n  Ciência retroativa: {total_servicos} serviços e {total_tarefas} tarefas.')


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0047_tarefa_recebida_em'),
    ]

    operations = [
        migrations.RunPython(preencher, migrations.RunPython.noop),
    ]
