from django.urls import path

from apps.ordens_servico.views import execucao_views as views

urlpatterns = [
    path('setores/', views.SetoresAcompanhadosView.as_view(), name='execucao-setores'),
    path('fila/', views.FilaView.as_view(), name='execucao-fila'),
    path('andamento/', views.AndamentoView.as_view(), name='execucao-andamento'),
    path('alertas/', views.AlertasView.as_view(), name='execucao-alertas'),
    path('concluidos/', views.ConcluidosView.as_view(), name='execucao-concluidos'),
    path('equipe/', views.EquipeView.as_view(), name='execucao-equipe'),
    path('meus-servicos/', views.MeusServicosView.as_view(), name='execucao-meus-servicos'),
    path('meus-servicos/contadores/', views.ContadoresMeusServicosView.as_view(),
         name='execucao-meus-servicos-contadores'),
    path('servicos/recebimento/', views.ReceberServicosView.as_view(), name='execucao-receber-servicos'),
    path('tarefas/recebimento/', views.ReceberTarefasView.as_view(), name='execucao-receber-tarefas'),
    path('servicos/<int:pk>/', views.DetalheDoServicoView.as_view(), name='execucao-servico'),
    path('servicos/<int:pk>/distribuir/', views.DistribuirView.as_view(), name='execucao-distribuir'),
    path('servicos/<int:pk>/ciencia/', views.CienciaView.as_view(), name='execucao-ciencia'),
]
