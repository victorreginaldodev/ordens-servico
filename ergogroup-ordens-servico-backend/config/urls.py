from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/contas/', include('apps.contas.urls')),
    path('api/organizacoes/', include('apps.organizacoes.urls')),
    path('api/clientes/', include('apps.clientes.urls')),
    path('api/catalogo/', include('apps.catalogo.urls')),
    path('api/ordens-servico/', include('apps.ordens_servico.urls')),
    path('api/execucao/', include('apps.ordens_servico.urls_execucao')),
    path('api/comercial/', include('apps.ordens_servico.urls_comercial')),
    path('api/financeiro/', include('apps.ordens_servico.urls_financeiro')),
    path('api/analise/', include('apps.analise.urls')),
    path('api/auditoria/', include('apps.auditoria.urls')),

    # Documentação da API
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
