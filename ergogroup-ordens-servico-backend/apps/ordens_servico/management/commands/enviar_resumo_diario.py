"""Resumo diário de pendências por e-mail (ADR 0010). Agendar no servidor uma vez por dia útil, de manhã:

    python manage.py enviar_resumo_diario

Respeita EMAIL_NOTIFICATIONS_ENABLED.
"""
from django.core.management.base import BaseCommand

from apps.ordens_servico.services import resumo_diario


class Command(BaseCommand):
    help = 'Envia a cada pessoa o resumo das pendências dela (serviços parados e OS liberadas sem faturar).'

    def handle(self, *args, **options):
        enviados = resumo_diario.enviar_resumos()
        self.stdout.write(f'Resumo diário: {enviados} e-mail(s) enviado(s).')
