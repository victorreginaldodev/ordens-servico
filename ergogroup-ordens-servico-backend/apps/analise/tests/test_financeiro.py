from django.urls import reverse
from rest_framework import status

from apps.organizacoes.apoio_testes import Perfil, criar_usuario_com_perfil

from .fixtures import PERFIS_SEM_VALORES, AnaliseTestCase


class FinanceiroAnaliseViewTests(AnaliseTestCase):
    url = reverse('analise-financeiro')

    def test_perfis_restritos_recebem_403(self):
        for tipo in PERFIS_SEM_VALORES:
            with self.subTest(tipo=tipo):
                self._login(self.usuarios[tipo])
                response = self.client.get(self.url)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requer_autenticacao(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_perfil_autorizado_recebe_kpis_corretos(self):
        self._login(self.usuarios[Perfil.GESTOR_FINANCEIRO])
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_cobrado'], 1000)
        self.assertEqual(response.data['total_para_cobrar'], 500)
        self.assertEqual(response.data['total_sem_liberacao'], 300)

    def test_perfil_autorizado_recebe_vendas_e_clientes(self):
        self._login(self.usuarios[Perfil.GESTOR_FINANCEIRO])
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        total_vendas = sum(item['total'] for item in response.data['vendas_por_mes'])
        self.assertEqual(total_vendas, 1800)

        mais_vendas = response.data['clientes']['mais_vendas']
        self.assertEqual(mais_vendas[0]['total_valor_vendas'], 1800)

        mais_cobranca = response.data['clientes']['mais_cobranca']
        self.assertEqual(mais_cobranca[0]['total_valor_cobrado'], 1000)

    def test_ticket_medio(self):
        self._login(self.usuarios[Perfil.GESTOR_FINANCEIRO])
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['ticket_medio']), 200.0)
