from django.urls import path

from apps.ordens_servico.views import financeiro_views as views

urlpatterns = [
    path('cobrancas/', views.CobrancasView.as_view(), name='financeiro-cobrancas'),
    path('ordens/<int:pk>/', views.SituacaoFinanceiraView.as_view(), name='financeiro-ordem'),
    path('conferencia/', views.ConferenciaView.as_view(), name='financeiro-conferencia'),
    path('conferencia/corrigir/', views.CorrigirConferenciaView.as_view(), name='financeiro-conferencia-corrigir'),
]
