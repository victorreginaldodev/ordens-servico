from rest_framework.routers import DefaultRouter
from apps.organizacoes.views import FuncaoViewSet, MembroSetorViewSet, OrganizacaoViewSet, SetorViewSet

router = DefaultRouter()
router.register(r'organizacoes', OrganizacaoViewSet, basename='organizacoes')
router.register(r'setores', SetorViewSet, basename='setores')
router.register(r'funcoes', FuncaoViewSet, basename='funcoes')
router.register(r'membros', MembroSetorViewSet, basename='membros-setor')

urlpatterns = router.urls
