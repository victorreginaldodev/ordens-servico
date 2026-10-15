"""Data da atribuição das tarefas existentes (plano de Meus serviços por etapa, B1): a criação da tarefa. A troca de
responsável anterior a este campo não é recuperada; a auditoria guarda o histórico, mas a regra é simples de propósito."""
from django.db import migrations
from django.db.models import F


def preencher(apps, schema_editor):
    Tarefa = apps.get_model('ordens_servico', 'Tarefa')
    total = Tarefa.objects.filter(atribuida_em__isnull=True).update(atribuida_em=F('criada_em'))
    print(f'\n  Data da atribuição preenchida em {total} tarefas.')


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0049_tarefa_atribuida_em'),
    ]

    operations = [
        migrations.RunPython(preencher, migrations.RunPython.noop),
    ]
