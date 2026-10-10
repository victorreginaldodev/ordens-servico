"""Confere, antes de trocar a restrição, que nenhum usuário tem vínculo em mais de um setor
(decisão de 10/10/2026: cada usuário pertence a um único setor).

Não apaga nem escolhe vínculos sozinha: se encontrar usuários com mais de um, para e lista
quais são, para que os vínculos sejam acertados antes de rodar de novo.
"""
from django.db import migrations
from django.db.models import Count


def conferir(apps, schema_editor):
    MembroSetor = apps.get_model('organizacoes', 'MembroSetor')
    repetidos = list(
        MembroSetor.objects.values('usuario_id').annotate(total=Count('id')).filter(total__gt=1)
        .values_list('usuario_id', flat=True)
    )
    if repetidos:
        raise RuntimeError(
            'Usuários com vínculo em mais de um setor (deixe um só antes de migrar): '
            + ', '.join(str(pk) for pk in sorted(repetidos))
        )


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0015_libera_funcoes_nos_setores'),
    ]

    operations = [
        migrations.RunPython(conferir, migrations.RunPython.noop),
    ]
