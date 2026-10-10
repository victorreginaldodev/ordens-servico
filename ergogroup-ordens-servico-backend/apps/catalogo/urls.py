from rest_framework.routers import DefaultRouter
from apps.catalogo.views import CatalogoViewSet, CatalogoOperacionalViewSet, SubitemCatalogoViewSet

router = DefaultRouter()
router.register(r'catalogos', CatalogoViewSet, basename='catalogos')
router.register(r'catalogos-operacionais', CatalogoOperacionalViewSet, basename='catalogos-operacionais')
router.register(r'subitens', SubitemCatalogoViewSet, basename='subitens-catalogo')

urlpatterns = router.urls
