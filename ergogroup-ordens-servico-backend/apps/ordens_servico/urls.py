from rest_framework.routers import DefaultRouter
from apps.ordens_servico.views import (
    OrdemServicoViewSet,
    ServicoViewSet,
    TarefaViewSet,
    OrdemServicoOperacionalViewSet,
)

router = DefaultRouter()
router.register(r'ordens', OrdemServicoViewSet, basename='ordens-servico')
router.register(r'servicos', ServicoViewSet, basename='servicos')
router.register(r'tarefas', TarefaViewSet, basename='tarefas')
router.register(r'operacionais', OrdemServicoOperacionalViewSet, basename='ordens-servico-operacionais')

urlpatterns = router.urls
