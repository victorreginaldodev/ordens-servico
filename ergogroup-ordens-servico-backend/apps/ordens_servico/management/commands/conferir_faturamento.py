"""Conferência do faturamento pela linha de comando (faturamento/04).

    python manage.py conferir_faturamento            # só mostra o resultado
    python manage.py conferir_faturamento --corrigir # refaz a sincronização das OS não liberadas
"""
from django.core.management.base import BaseCommand

from apps.ordens_servico.services import conferencia


class Command(BaseCommand):
    help = 'Mostra a conferência do faturamento e, com --corrigir, refaz a sincronização das OS não liberadas.'

    def add_arguments(self, parser):
        parser.add_argument('--corrigir', action='store_true', help='Refaz a sincronização antes de conferir.')

    def handle(self, *args, **options):
        if options['corrigir']:
            resultado = conferencia.corrigir()
            self.stdout.write(
                f"Sincronização refeita: {resultado['servicos_corrigidos']} serviço(s) corrigido(s), "
                f"{resultado['ordens_liberadas']} OS liberada(s)."
            )
        for verificacao in conferencia.conferencia()['verificacoes']:
            marca = 'OK' if verificacao['quantidade'] == 0 else verificacao['tipo'].upper()
            self.stdout.write(f"[{marca}] {verificacao['titulo']}: {verificacao['quantidade']}")
            for item in verificacao['itens']:
                servico = f" · {item['servico_nome']}" if item['servico_nome'] else ''
                self.stdout.write(f"    OS {item['ordem_servico_id']} ({item['cliente_nome']}){servico}: {item['detalhe']}")
