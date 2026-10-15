"""Prepara a saída do recorrente e do intervalo entre parcelas (ADR 0007, revisão de 13/10/2026).

Antes de as colunas saírem (migrações 0038 a 0041), nada se perde:
- recorrente vira parcelado, com o número de meses como número de parcelas;
- o que não cabe nos campos que ficam (valor mensal, dias de fechamento e de vencimento, intervalo diferente
  de 30 dias) é acrescentado à observação da OS, que é a observação de pagamento e faturamento.

No banco de dev não há nenhuma OS recorrente nem esses campos preenchidos (o intervalo é 30 em todas as
parceladas); em produção, conferir antes de rodar.
"""
from django.db import migrations
from django.db.models import Q

INTERVALO_MENSAL = 30


def _reais(valor):
    texto = f'{valor:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')
    return f'R$ {texto}'


def _texto(os):
    partes = []
    if os.tipo_condicao == 'recorrente':
        texto = f'recorrente em {os.quantidade_parcelas or "?"} meses'
        if os.valor_mensal is not None:
            texto += f' de {_reais(os.valor_mensal)}'
        partes.append(texto)
    if os.intervalo_parcelas_dias and os.intervalo_parcelas_dias != INTERVALO_MENSAL:
        partes.append(f'parcelas a cada {os.intervalo_parcelas_dias} dias')
    if os.dia_fechamento:
        partes.append(f'fecha dia {os.dia_fechamento}')
    if os.dia_vencimento:
        partes.append(f'vence dia {os.dia_vencimento}')
    return f'[Condição anterior: {", ".join(partes)}]' if partes else ''


def converter(apps, schema_editor):
    OrdemServico = apps.get_model('ordens_servico', 'OrdemServico')
    afetadas = OrdemServico.objects.filter(
        Q(tipo_condicao='recorrente') | Q(valor_mensal__isnull=False) | Q(dia_fechamento__isnull=False)
        | Q(dia_vencimento__isnull=False) | (Q(intervalo_parcelas_dias__isnull=False) & ~Q(intervalo_parcelas_dias=INTERVALO_MENSAL))
    )
    for os in afetadas:
        texto = _texto(os)
        if texto:
            os.observacao = f'{os.observacao}\n{texto}' if os.observacao else texto
        if os.tipo_condicao == 'recorrente':
            os.tipo_condicao = 'parcelado' if (os.quantidade_parcelas or 0) >= 2 else 'a_vista'
        os.save(update_fields=['observacao', 'tipo_condicao'])


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0036_ordemservico_valor_mensal'),
    ]

    operations = [
        migrations.RunPython(converter, migrations.RunPython.noop),
    ]
