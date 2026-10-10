"""O prazo do serviço passa a ser calculado: a maior data entre os prazos das tarefas não canceladas
(ADR 0006, 5.1). Recalcula os serviços existentes; sem tarefas, o prazo fica vazio."""
from django.db import migrations
from django.db.models import Max, Q


def recalcular(apps, schema_editor):
    Servico = apps.get_model('ordens_servico', 'Servico')
    servicos = Servico.objects.annotate(
        prazo_calculado=Max('tarefas__prazo', filter=~Q(tarefas__status='cancelada')),
    ).only('pk', 'prazo')
    alterados = 0
    for servico in servicos.iterator():
        if servico.prazo != servico.prazo_calculado:
            Servico.objects.filter(pk=servico.pk).update(prazo=servico.prazo_calculado)
            alterados += 1
    print(f'\n  Prazo recalculado em {alterados} serviços.')


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0034_servico_alerta_ciente_observacao'),
    ]

    operations = [
        migrations.RunPython(recalcular, migrations.RunPython.noop),
    ]
