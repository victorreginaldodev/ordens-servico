from rest_framework.routers import DefaultRouter

from apps.auditoria.views import RegistroAuditoriaViewSet


router = DefaultRouter()
router.register(r'registros', RegistroAuditoriaViewSet, basename='auditoria-registros')

urlpatterns = router.urls
