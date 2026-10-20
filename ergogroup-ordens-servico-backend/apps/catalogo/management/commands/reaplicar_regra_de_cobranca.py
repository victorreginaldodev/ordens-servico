"""Aplica a regra atual de cobrança de cada catálogo operacional às OS operacionais ainda não faturadas (ADR 0011,
revisão de 19/10/2026). Use quando a regra mudou sem passar pela API ou pelo admin (ex.: no deploy, ou depois de
configurar o catálogo com uma versão anterior do sistema).

    python manage.py reaplicar_regra_de_cobranca
    python manage.py reaplicar_regra_de_cobranca --simular   # só mostra o que mudaria
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalogo.models import CatalogoOperacional


class Simulacao(Exception):
    pass


class Command(BaseCommand):
    help = 'Aplica a regra de cobrança dos catálogos operacionais às OS operacionais ainda não faturadas.'

    def add_arguments(self, parser):
        parser.add_argument('--simular', action='store_true', help='Mostra o que mudaria, sem gravar.')

    def handle(self, *args, **options):
        total = {'passaram_a_cobrar': 0, 'deixaram_de_cobrar': 0, 'liberadas': 0}
        try:
            with transaction.atomic():
                for catalogo in CatalogoOperacional.objects.all():
                    resultado = catalogo.reaplicar_regra_de_cobranca()
                    if any(resultado.values()):
                        self.stdout.write(
                            f'{catalogo.nome}: {resultado["passaram_a_cobrar"]} passaram a cobrar, '
                            f'{resultado["deixaram_de_cobrar"]} deixaram de cobrar, '
                            f'{resultado["liberadas"]} liberadas para faturar.'
                        )
                    for chave in total:
                        total[chave] += resultado[chave]
                if options['simular']:
                    raise Simulacao
        except Simulacao:
            self.stdout.write('Simulação: nada foi gravado.')
        self.stdout.write(
            f'Total: {total["passaram_a_cobrar"]} passaram a cobrar, {total["deixaram_de_cobrar"]} deixaram de cobrar, '
            f'{total["liberadas"]} liberadas para faturar.'
        )
