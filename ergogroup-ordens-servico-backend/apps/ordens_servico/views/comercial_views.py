"""Endpoints do comercial (fase 9). A lógica está em `services/comercial.py`."""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ordens_servico.models import OrdemServico
from apps.ordens_servico.serializers.comercial_serializer import ResumoDaVendaSerializer
from apps.ordens_servico.services import comercial
from apps.ordens_servico.services.visibilidade import ordens_visiveis


class ResumoDaVendaView(APIView):
    @extend_schema(
        summary='Resumo da venda',
        description=(
            'Quem vendeu e quando, o andamento e, por serviço, o setor, a etapa, quem executou e quando. '
            'Condições, liberação e lançamento só aparecem para quem tem `financeiro.ver_valores`. '
            'Acessa quem vê a OS.'
        ),
        responses={200: ResumoDaVendaSerializer},
        tags=['comercial'],
    )
    def get(self, request, pk):
        ordem = get_object_or_404(ordens_visiveis(OrdemServico.objects.all(), request.user), pk=pk)
        return Response(ResumoDaVendaSerializer(comercial.resumo_da_venda(ordem, request.user)).data)
