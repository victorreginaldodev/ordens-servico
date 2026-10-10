from django.urls import reverse
from rest_framework import status

from apps.ordens_servico.models import OrdemServico
from apps.organizacoes.apoio_testes import Perfil, criar_usuario_com_perfil

from .fixtures import PERFIS_SEM_VALORES, AnaliseTestCase


class OperacionalAnaliseViewContadoresTests(AnaliseTestCase):
    url = reverse('analise-operacional')

    def test_requer_autenticacao(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_perfis_restritos_veem_contadores_operacionais(self):
        for tipo in PERFIS_SEM_VALORES:
            with self.subTest(tipo=tipo):
                self._login(self.usuarios[tipo])
                response = self.client.get(self.url)

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertNotIn('clientes', response.data)
                self.assertNotIn('vendas_por_mes', response.data)
                self.assertEqual(response.data['ordens_servico']['total'], OrdemServico.objects.count())

    def test_percentual_servicos_por_catalogo(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        principais = {
            item['catalogo_id']: item
            for item in response.data['servicos']['principais_por_quantidade']
        }
        item_base = principais[self.catalogo.id]
        item_secundario = principais[self.catalogo_secundario.id]

        self.assertEqual(item_base['total'] + item_secundario['total'], 8)
        self.assertEqual(item_base['total'], 6)
        self.assertEqual(item_secundario['total'], 2)
        self.assertEqual(item_base['percentual'], 75.0)
        self.assertEqual(item_secundario['percentual'], 25.0)

    def test_percentual_revisoes_por_cliente(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        revisoes = {
            item['cliente_id']: item
            for item in response.data['minios']['revisoes_por_cliente']
        }
        self.assertEqual(revisoes[self.cliente.id]['total'], 1)
        self.assertEqual(revisoes[self.cliente_secundario.id]['total'], 2)
        # Percentual = participacao no total geral de revisoes (3), nao no total
        # de OSO daquele cliente - ranking de concentracao de retrabalho.
        self.assertEqual(revisoes[self.cliente.id]['percentual'], round(1 / 3 * 100, 1))
        self.assertEqual(revisoes[self.cliente_secundario.id]['percentual'], round(2 / 3 * 100, 1))

    def test_tempo_por_catalogo_operacional(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        entradas = {
            item['catalogo_id']: item
            for item in response.data['tempos_medios']['tempo_por_catalogo_oso']
        }
        base = entradas[self.catalogo_operacional.id]
        secundario = entradas[self.catalogo_operacional_secundario.id]

        self.assertEqual(base['total_concluidos'], 3)
        self.assertEqual(base['media_dias'], 0.0)
        self.assertEqual(secundario['total_concluidos'], 1)
        self.assertEqual(secundario['media_dias'], 2.0)
        self.assertEqual(float(secundario['horas_estimadas']), 1.0)
