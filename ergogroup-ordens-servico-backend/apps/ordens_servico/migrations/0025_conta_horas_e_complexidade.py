"""Registra quantos serviços e tarefas ainda têm horas ou complexidade antes de as colunas saírem
(ADR 0005). Esses valores se perdem; no dev, em 10/10/2026, eram só 2 tarefas com horas."""
from django.db import migrations


def contar(apps, schema_editor):
    Servico = apps.get_model('ordens_servico', 'Servico')
    Tarefa = apps.get_model('ordens_servico', 'Tarefa')
    servicos_horas = Servico.objects.filter(horas_estimadas__isnull=False).count()
    servicos_complexidade = Servico.objects.filter(complexidade__isnull=False).count()
    tarefas_horas = Tarefa.objects.filter(horas_estimadas__isnull=False).count()
    print(
        f'\n  Removendo horas e complexidade: {servicos_horas} serviços com horas, '
        f'{servicos_complexidade} com complexidade, {tarefas_horas} tarefas com horas.'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0024_remove_ordemservico_gestor_contrato_telefone'),
    ]

    operations = [
        migrations.RunPython(contar, migrations.RunPython.noop),
    ]
