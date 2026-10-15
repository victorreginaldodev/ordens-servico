"""Marca `tarefas.receber` (revisão de permissões, P2) nas funções que podem ser usadas em setores que executam
serviços (com catálogo). Até aqui, qualquer membro desses setores recebia tarefas: assim nada muda no dia."""
from django.db import migrations


def marcar(apps, schema_editor):
    Funcao = apps.get_model('organizacoes', 'Funcao')
    FuncaoPermissao = apps.get_model('organizacoes', 'FuncaoPermissao')
    Catalogo = apps.get_model('catalogo', 'Catalogo')
    setores_que_executam = set(Catalogo.objects.values_list('setor_id', flat=True).distinct())
    # O setor de execução da estrutura inicial (organizacoes/0013), mesmo antes de ter catálogos (ex.: banco novo).
    Setor = apps.get_model('organizacoes', 'Setor')
    setores_que_executam |= set(Setor.objects.filter(nome='Segurança do Trabalho').values_list('pk', flat=True))
    funcoes = Funcao.objects.filter(setores__in=setores_que_executam).distinct()
    marcadas = []
    for funcao in funcoes:
        _, criada = FuncaoPermissao.objects.get_or_create(funcao=funcao, permissao='tarefas.receber')
        if criada:
            marcadas.append(funcao.nome)
    print(f'\n  "Recebe tarefas" marcada em {len(marcadas)} funções: {", ".join(sorted(marcadas))}.')


def desmarcar(apps, schema_editor):
    apps.get_model('organizacoes', 'FuncaoPermissao').objects.filter(permissao='tarefas.receber').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0020_atuacaoemsetor'),
        ('catalogo', '0008_catalogo_setor_obrigatorio'),
    ]

    operations = [
        migrations.RunPython(marcar, desmarcar),
    ]
