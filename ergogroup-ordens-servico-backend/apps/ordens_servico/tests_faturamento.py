import importlib
from datetime import date

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.ordens_servico.models import (
    LiberarEm, OrdemServico, OrigemLancamento, Servico, Tarefa, TipoCondicao,
)
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario

conversao = importlib.import_module('apps.ordens_servico.migrations.0015_converte_condicoes_de_pagamento')


class CondicaoDePagamentoTestCase(APITestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(nome='Cliente Faturamento')
        self.client.force_authenticate(user=criar_usuario(Perfil.COMERCIAL))

    def criar(self, **condicao):
        return self.client.post(reverse('ordens-servico-list'), {
            'cliente': self.cliente.id, 'data_venda': '2026-10-10', 'valor': '1200.00', **condicao,
        }, format='json')

    def test_a_vista_e_o_padrao(self):
        response = self.criar()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['tipo_condicao'], TipoCondicao.A_VISTA)
        self.assertEqual(response.data['liberar_em'], LiberarEm.CONCLUSAO)

    def test_parcelado_exige_duas_parcelas_e_primeiro_vencimento(self):
        response = self.criar(tipo_condicao='parcelado', quantidade_parcelas=1)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantidade_parcelas', response.data)
        self.assertIn('data_acordada_cobranca', response.data)

    def test_parcelado_aceita_mais_de_12_parcelas_e_assume_intervalo_mensal(self):
        response = self.criar(tipo_condicao='parcelado', quantidade_parcelas=24, data_acordada_cobranca='2026-11-10')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['quantidade_parcelas'], 24)
        self.assertEqual(response.data['intervalo_parcelas_dias'], 30)

    def test_parcelado_com_intervalo_proprio(self):
        response = self.criar(
            tipo_condicao='parcelado', quantidade_parcelas=2, data_acordada_cobranca='2026-11-10',
            intervalo_parcelas_dias=60,
        )

        self.assertEqual(response.data['intervalo_parcelas_dias'], 60)

    def test_recorrente_exige_meses_e_dia_de_vencimento(self):
        response = self.criar(tipo_condicao='recorrente')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantidade_parcelas', response.data)
        self.assertIn('dia_vencimento', response.data)
        self.assertIn('valor_mensal', response.data)

    def test_recorrente_valido(self):
        response = self.criar(
            tipo_condicao='recorrente', quantidade_parcelas=24, dia_fechamento=25, dia_vencimento=15,
            valor_mensal='1500.00', valor='36000.00',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['tipo_condicao_display'], 'Recorrente')
        self.assertEqual(response.data['valor_mensal'], '1500.00')
        self.assertEqual(response.data['valor'], '36000.00')

    def test_dias_do_mes_entre_1_e_31(self):
        response = self.criar(
            tipo_condicao='recorrente', quantidade_parcelas=12, dia_fechamento=0, dia_vencimento=32, valor_mensal='10.00',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dia_fechamento', response.data)
        self.assertIn('dia_vencimento', response.data)

    def test_edicao_valida_contra_os_dados_atuais(self):
        ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=date(2026, 10, 10), valor=100)

        response = self.client.patch(
            reverse('ordens-servico-detail', args=[ordem.id]), {'tipo_condicao': 'parcelado'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_campos_de_contrato_nao_existem_mais(self):
        response = self.criar()

        for campo in ('contrato', 'objeto_contrato', 'cobranca_imediata', 'numero_nf'):
            self.assertNotIn(campo, response.data)


class LiberacaoTestCase(APITestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(nome='Cliente Liberacao')
        self.tecnico = criar_usuario(Perfil.TECNICO)

    def test_liberar_na_venda(self):
        ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=100, liberar_em=LiberarEm.VENDA,
        )

        self.assertTrue(ordem.liberada_para_cobranca)
        self.assertIsNotNone(ordem.liberada_para_cobranca_em)

    def test_liberar_na_conclusao_espera_os_servicos(self):
        ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=timezone.localdate(), valor=100)
        servico = Servico.objects.create(ordem_servico=ordem, descricao='PGR')
        tarefa = Tarefa.objects.create(servico=servico, responsavel=self.tecnico)
        ordem.refresh_from_db()
        self.assertFalse(ordem.liberada_para_cobranca)

        tarefa.status = StatusTarefa.CONCLUIDA
        tarefa.save()

        ordem.refresh_from_db()
        self.assertTrue(ordem.liberada_para_cobranca)
        self.assertEqual(ordem.liberada_para_cobranca_por, self.tecnico)


class LancamentoTestCase(APITestCase):
    def setUp(self):
        self.financeiro = criar_usuario(Perfil.FINANCEIRO)
        self.client.force_authenticate(user=self.financeiro)
        self.cliente = Cliente.objects.create(nome='Cliente Lancamento')

    def test_registra_referencia_origem_manual_data_e_autor(self):
        ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=100, liberar_em=LiberarEm.VENDA,
        )

        response = self.client.patch(
            reverse('ordens-servico-registrar-cobranca', args=[ordem.id]),
            {'referencia_lancamento': 'ASAAS-pay_123', 'data_cobranca': '2026-10-10'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ordem.refresh_from_db()
        self.assertTrue(ordem.cobranca_realizada)
        self.assertEqual(ordem.referencia_lancamento, 'ASAAS-pay_123')
        self.assertEqual(ordem.origem_lancamento, OrigemLancamento.MANUAL)
        self.assertEqual(ordem.data_cobranca, date(2026, 10, 10))
        self.assertEqual(ordem.cobranca_realizada_por, self.financeiro)

    def test_os_nao_liberada_nao_e_lancada(self):
        ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=timezone.localdate(), valor=100)

        response = self.client.patch(
            reverse('ordens-servico-registrar-cobranca', args=[ordem.id]), {'referencia_lancamento': '1'},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        ordem.refresh_from_db()
        self.assertFalse(ordem.cobranca_realizada)


class OcultacaoDaCondicaoTestCase(APITestCase):
    def test_sem_ver_valores_nao_recebe_a_condicao(self):
        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Oculto'), data_venda=timezone.localdate(), valor=100,
            tipo_condicao=TipoCondicao.RECORRENTE, quantidade_parcelas=12, dia_vencimento=15, dia_fechamento=25,
            valor_mensal=100,
        )
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))

        detalhe = self.client.get(reverse('ordens-servico-detail', args=[ordem.id]))

        for campo in (
            'tipo_condicao', 'dia_vencimento', 'dia_fechamento', 'intervalo_parcelas_dias', 'liberar_em', 'valor_mensal',
        ):
            self.assertNotIn(campo, detalhe.data)


class TextoDoContratoNaObservacaoTestCase(APITestCase):
    """A migração 0015 copia os dados do contrato para a observação antes de remover os campos."""

    def test_monta_objeto_vigencia_e_gestor(self):
        class Antiga:
            objeto_contrato = 'Gestão de SST'
            contrato_data_inicio = date(2026, 1, 1)
            contrato_data_fim = date(2027, 12, 31)
            gestor_contrato_nome = 'Fulana de Tal'
            gestor_contrato_email = 'fulana@cliente.test'
            gestor_contrato_telefone = None

        texto = conversao._texto_contrato(Antiga)

        self.assertIn('Objeto: Gestão de SST', texto)
        self.assertIn('Vigência: 01/01/2026 a 31/12/2027', texto)
        self.assertIn('Gestor do contrato: Fulana de Tal · fulana@cliente.test', texto)
