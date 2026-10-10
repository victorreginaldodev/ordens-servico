from django.apps import AppConfig


class OrdensServicoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ordens_servico'

    def ready(self):
        import apps.ordens_servico.signals  # noqa: F401
