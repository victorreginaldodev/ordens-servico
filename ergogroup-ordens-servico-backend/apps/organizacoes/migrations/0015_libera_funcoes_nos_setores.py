"""Libera as funções existentes nos setores (decisão de 10/10/2026).

Cada função fica liberada nos setores onde já tem pessoas vinculadas (para nenhum vínculo existente
ficar inválido) e, para as funções iniciais, também no setor da sua área, mesmo que ainda não haja
ninguém com ela (ex.: Gestor Financeiro).
"""
from django.db import migrations

ORGANIZACAO = 'Ergogroup'

SETOR_DAS_FUNCOES_INICIAIS = {
    'Diretor': 'Diretoria',
    'Gestor Comercial': 'Comercial',
    'Comercial': 'Comercial',
    'Gestor Técnico': 'Segurança do Trabalho',
    'Sub-Gestor Técnico': 'Segurança do Trabalho',
    'Técnico': 'Segurança do Trabalho',
    'Gestor Financeiro': 'Financeiro',
    'Financeiro': 'Financeiro',
    'Gestor Administrativo': 'Administrativo',
    'Administrativo': 'Administrativo',
}


def liberar(apps, schema_editor):
    Funcao = apps.get_model('organizacoes', 'Funcao')
    Setor = apps.get_model('organizacoes', 'Setor')
    MembroSetor = apps.get_model('organizacoes', 'MembroSetor')

    for funcao in Funcao.objects.all():
        setores = set(MembroSetor.objects.filter(funcao=funcao).values_list('setor_id', flat=True))
        nome_setor = SETOR_DAS_FUNCOES_INICIAIS.get(funcao.nome)
        if nome_setor and funcao.organizacao.nome == ORGANIZACAO:
            setor = Setor.objects.filter(organizacao=funcao.organizacao, nome=nome_setor).first()
            if setor is not None:
                setores.add(setor.pk)
        funcao.setores.add(*setores)


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0014_funcao_setores'),
    ]

    operations = [
        migrations.RunPython(liberar, migrations.RunPython.noop),
    ]
