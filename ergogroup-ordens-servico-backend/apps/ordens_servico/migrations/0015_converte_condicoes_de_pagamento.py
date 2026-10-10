"""Converte as condições de pagamento das OS existentes para os campos novos (ADR 0007, padrão conservador).

- ``tipo_condicao``: parcelado quando há mais de 1 parcela; à vista nos demais casos. O sistema não interpreta
  a observação: contratos registrados como "12 parcelas" ficam como parcelado até o financeiro reclassificar.
- ``intervalo_parcelas_dias``: 30 (mensal) nas parceladas.
- ``liberar_em``: ``venda`` onde havia ``cobranca_imediata``; ``conclusao`` nos demais.
- ``referencia_lancamento``: cópia do ``numero_nf``; ``origem_lancamento`` = manual nas OS já cobradas.
- Contrato: objeto, vigência e gestor são acrescentados à observação, porque os campos de contrato saem
  nas migrações seguintes.

Inconsistências herdadas (cobradas sem liberação, valor zero) não são alteradas.
"""
from django.db import migrations
from django.db.models import Q

CAMPOS_CONTRATO = (
    'objeto_contrato', 'contrato_data_inicio', 'contrato_data_fim',
    'gestor_contrato_nome', 'gestor_contrato_email', 'gestor_contrato_telefone',
)


def _data(valor):
    return valor.strftime('%d/%m/%Y') if valor else 'não informada'


def _texto_contrato(os):
    linhas = ['[Contrato — dados copiados dos antigos campos de contrato]']
    if os.objeto_contrato:
        linhas.append(f'Objeto: {os.objeto_contrato}')
    if os.contrato_data_inicio or os.contrato_data_fim:
        linhas.append(f'Vigência: {_data(os.contrato_data_inicio)} a {_data(os.contrato_data_fim)}')
    gestor = [v for v in (os.gestor_contrato_nome, os.gestor_contrato_email, os.gestor_contrato_telefone) if v]
    if gestor:
        linhas.append('Gestor do contrato: ' + ' · '.join(gestor))
    return '\n'.join(linhas)


def converter(apps, schema_editor):
    OrdemServico = apps.get_model('ordens_servico', 'OrdemServico')

    OrdemServico.objects.filter(quantidade_parcelas__gt=1).update(
        tipo_condicao='parcelado', intervalo_parcelas_dias=30,
    )
    OrdemServico.objects.filter(cobranca_imediata=True).update(liberar_em='venda')
    OrdemServico.objects.filter(cobranca_realizada=True).update(origem_lancamento='manual')

    for os in OrdemServico.objects.filter(numero_nf__isnull=False).only('pk', 'numero_nf'):
        OrdemServico.objects.filter(pk=os.pk).update(referencia_lancamento=str(os.numero_nf))

    com_contrato = Q(contrato=True) | Q(contrato_data_inicio__isnull=False) | Q(contrato_data_fim__isnull=False)
    for campo in CAMPOS_CONTRATO:
        if 'data' not in campo:
            com_contrato |= Q(**{f'{campo}__isnull': False}) & ~Q(**{campo: ''})
    copiadas = []
    for os in OrdemServico.objects.filter(com_contrato):
        bloco = _texto_contrato(os)
        observacao = f'{os.observacao}\n\n{bloco}' if os.observacao else bloco
        OrdemServico.objects.filter(pk=os.pk).update(observacao=observacao)
        copiadas.append(os.pk)
    if copiadas:
        print(f'\n  Dados de contrato copiados para a observação das OS: {copiadas}')


def desfazer(apps, schema_editor):
    """Volta ``cobranca_imediata`` e ``numero_nf``. Os dados de contrato continuam na observação."""
    OrdemServico = apps.get_model('ordens_servico', 'OrdemServico')

    OrdemServico.objects.filter(liberar_em='venda').update(cobranca_imediata=True)
    for os in OrdemServico.objects.filter(referencia_lancamento__isnull=False).only('pk', 'referencia_lancamento'):
        referencia = os.referencia_lancamento.strip()
        if referencia.isdigit():
            OrdemServico.objects.filter(pk=os.pk).update(numero_nf=int(referencia))


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0014_ordemservico_referencia_lancamento'),
    ]

    operations = [
        migrations.RunPython(converter, desfazer),
    ]
