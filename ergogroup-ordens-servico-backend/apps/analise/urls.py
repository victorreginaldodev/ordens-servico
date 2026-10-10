from django.urls import path
from apps.analise.views import FinanceiroAnaliseView, OperacionalAnaliseView

urlpatterns = [
    path('financeiro/', FinanceiroAnaliseView.as_view(), name='analise-financeiro'),
    path('operacional/', OperacionalAnaliseView.as_view(), name='analise-operacional'),
]
