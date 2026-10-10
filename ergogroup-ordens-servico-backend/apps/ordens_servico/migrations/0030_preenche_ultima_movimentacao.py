"""Preenche a última movimentação dos serviços existentes (ADR 0008, 3): a mais recente entre a criação do
serviço e a última criação ou alteração das suas tarefas. Sem isso, todos começariam com a data da migração."""
from django.db import migrations
from django.db.models import Max


def preencher(apps, schema_editor):
    Servico = apps.get_model('ordens_servico', 'Servico')
    servicos = Servico.objects.annotate(
        ultima_tarefa_criada=Max('tarefas__criada_em'), ultima_tarefa_alterada=Max('tarefas__atualizado_em'),
    ).only('pk', 'criado_em')
    for servico in servicos.iterator():
        datas = [d for d in (servico.criado_em, servico.ultima_tarefa_criada, servico.ultima_tarefa_alterada) if d]
        Servico.objects.filter(pk=servico.pk).update(ultima_movimentacao_em=max(datas))


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0029_servico_ultima_movimentacao_em'),
    ]

    operations = [
        migrations.RunPython(preencher, migrations.RunPython.noop),
    ]
