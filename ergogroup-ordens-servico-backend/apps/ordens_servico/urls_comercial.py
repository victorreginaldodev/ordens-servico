from django.urls import path

from apps.ordens_servico.views import comercial_views as views

urlpatterns = [
    path('vendas/<int:pk>/', views.ResumoDaVendaView.as_view(), name='comercial-venda'),
]
