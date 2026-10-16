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
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario

conversao = importlib.import_module('apps.ordens_servico.migrations.0015_converte_condicoes_de_pagamento')
recorrente = importlib.import_module('apps.ordens_servico.migrations.0037_converte_recorrente_e_intervalo')


class CondicaoDePagamentoTestCase(APITestCase):
    """À vista ou parcelado; o vencimento é uma data ou dias após a nota (revisão de 13/10/2026)."""

    def setUp(self):
        self.cliente = Cliente.objects.create(nome='Cliente Faturamento')
        self.client.force_authenticate(user=criar_usuario(Perfil.COMERCIAL))

    def criar(self, **condicao):
        return self.client.post(reverse('ordens-servico-list'), {
            'cliente': self.cliente.id, 'data_venda': '2026-10-10', 'valor': '1200.00', **condicao,
        }, format='json')

    def test_a_vista_e_o_padrao(self):
        response = self.criar(data_acordada_cobranca='2026-11-10')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['tipo_condicao'], TipoCondicao.A_VISTA)
        self.assertEqual(response.data['liberar_em'], LiberarEm.CONCLUSAO)

    def test_venda_nova_exige_o_vencimento(self):
        response = self.criar()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('data_acordada_cobranca', response.data)

    def test_vencimento_em_dias_apos_a_nota(self):
        response = self.criar(vencimento_dias_apos_nota=21)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['condicao_resumo'], 'À vista, vence 21 dias após a nota')

    def test_vencimento_e_data_ou_dias_nunca_os_dois(self):
        response = self.criar(data_acordada_cobranca='2026-11-10', vencimento_dias_apos_nota=21)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vencimento_dias_apos_nota', response.data)

    def test_dias_apos_a_nota_de_1_a_365(self):
        self.assertIn('vencimento_dias_apos_nota', self.criar(vencimento_dias_apos_nota=400).data)

    def test_parcelado_exige_duas_parcelas_e_o_vencimento_da_primeira(self):
        response = self.criar(tipo_condicao='parcelado', quantidade_parcelas=1)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quantidade_parcelas', response.data)
        self.assertIn('data_acordada_cobranca', response.data)

    def test_parcelado_aceita_mais_de_12_parcelas(self):
        response = self.criar(tipo_condicao='parcelado', quantidade_parcelas=24, data_acordada_cobranca='2026-11-10')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['quantidade_parcelas'], 24)
        self.assertEqual(response.data['condicao_resumo'], 'Parcelado em 24x de R$ 50,00 (mensais), 1ª parcela 10/11/2026')

    def test_dia_das_demais_parcelas(self):
        response = self.criar(
            tipo_condicao='parcelado', quantidade_parcelas=6, vencimento_dias_apos_nota=21, dia_vencimento_demais=10,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['dia_vencimento_demais'], 10)
        self.assertEqual(
            response.data['condicao_resumo'],
            'Parcelado em 6x de R$ 200,00 (mensais), 1ª parcela 21 dias após a nota, demais todo dia 10',
        )

    def test_dia_das_demais_vazio_e_o_mesmo_dia_da_primeira(self):
        response = self.criar(tipo_condicao='parcelado', quantidade_parcelas=2, data_acordada_cobranca='2026-11-10')

        self.assertIsNone(response.data['dia_vencimento_demais'])
        self.assertNotIn('demais', response.data['condicao_resumo'])

    def test_dia_das_demais_so_no_parcelado(self):
        response = self.criar(data_acordada_cobranca='2026-11-10', dia_vencimento_demais=10)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('dia_vencimento_demais', response.data)

    def test_dia_das_demais_de_1_a_31(self):
        for dia in (0, 32):
            response = self.criar(
                tipo_condicao='parcelado', quantidade_parcelas=2, data_acordada_cobranca='2026-11-10',
                dia_vencimento_demais=dia,
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('dia_vencimento_demais', response.data)

    def test_passar_para_a_vista_limpa_o_dia_das_demais(self):
        ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=date(2026, 10, 10), valor=100, tipo_condicao=TipoCondicao.PARCELADO,
            quantidade_parcelas=2, data_acordada_cobranca=date(2026, 11, 5), dia_vencimento_demais=10,
        )

        response = self.client.patch(
            reverse('ordens-servico-detail', args=[ordem.id]), {'tipo_condicao': 'a_vista'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ordem.refresh_from_db()
        self.assertIsNone(ordem.dia_vencimento_demais)

    def test_recorrente_nao_existe_mais(self):
        response = self.criar(tipo_condicao='recorrente', quantidade_parcelas=24, data_acordada_cobranca='2026-11-10')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('tipo_condicao', response.data)
        for campo in ('valor_mensal', 'dia_fechamento', 'dia_vencimento', 'intervalo_parcelas_dias'):
            self.assertNotIn(campo, self.criar(data_acordada_cobranca='2026-11-10').data)

    def test_edicao_valida_contra_os_dados_atuais(self):
        ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=date(2026, 10, 10), valor=100)

        response = self.client.patch(
            reverse('ordens-servico-detail', args=[ordem.id]), {'tipo_condicao': 'parcelado'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_venda_antiga_sem_vencimento_continua_editavel_fora_da_condicao(self):
        ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=date(2026, 10, 10), valor=100)

        response = self.client.patch(
            reverse('ordens-servico-detail', args=[ordem.id]), {'prioridade': 'alta'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_na_edicao_a_data_troca_os_dias(self):
        ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=date(2026, 10, 10), valor=100, vencimento_dias_apos_nota=21,
        )

        response = self.client.patch(
            reverse('ordens-servico-detail', args=[ordem.id]), {'data_acordada_cobranca': '2026-12-01'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ordem.refresh_from_db()
        self.assertIsNone(ordem.vencimento_dias_apos_nota)

    def test_campos_de_contrato_nao_existem_mais(self):
        response = self.criar(data_acordada_cobranca='2026-11-10')

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


class LiberacaoComServicoCanceladoTestCase(APITestCase):
    """Serviço cancelado não conta para concluir a OS; todos cancelados, a OS fica cancelada (13/10/2026).

    Antes da correção, a OS com um serviço cancelado ficava "em andamento" e nunca era liberada.
    """

    def setUp(self):
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Cancelamento'), data_venda=timezone.localdate(), valor=100,
        )
        self.feito = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR')
        self.tarefa = Tarefa.objects.create(servico=self.feito, responsavel=self.tecnico)
        self.cancelado = Servico.objects.create(ordem_servico=self.ordem, descricao='LTCAT')

    def cancelar(self):
        Servico.objects.filter(pk=self.cancelado.pk).update(status=StatusServico.CANCELADO)
        self.cancelado.refresh_from_db()
        self.cancelado.sincronizar_status()

    def concluir(self):
        self.tarefa.status = StatusTarefa.CONCLUIDA
        self.tarefa.save()

    def test_cancela_um_e_depois_conclui_o_outro(self):
        self.cancelar()
        self.concluir()

        self.ordem.refresh_from_db()
        self.assertEqual(self.ordem.status, 'concluida')
        self.assertTrue(self.ordem.liberada_para_cobranca)

    def test_conclui_um_e_depois_cancela_o_outro(self):
        self.concluir()
        self.cancelar()

        self.ordem.refresh_from_db()
        self.assertEqual(self.ordem.status, 'concluida')
        self.assertTrue(self.ordem.liberada_para_cobranca)

    def test_todos_cancelados_a_os_fica_cancelada_e_nao_libera(self):
        Servico.objects.filter(pk=self.feito.pk).update(status=StatusServico.CANCELADO)
        self.cancelar()

        self.ordem.refresh_from_db()
        self.assertEqual(self.ordem.status, 'cancelada')
        self.assertFalse(self.ordem.concluida)
        self.assertFalse(self.ordem.liberada_para_cobranca)

    def test_liberacao_feita_na_venda_continua_com_todos_cancelados(self):
        """A liberação acontece uma vez só (ADR 0007): cancelar os serviços depois não a desfaz."""
        ordem = OrdemServico.objects.create(
            cliente=self.ordem.cliente, data_venda=timezone.localdate(), valor=100, liberar_em=LiberarEm.VENDA,
        )
        servico = Servico.objects.create(ordem_servico=ordem, descricao='PGR')
        Servico.objects.filter(pk=servico.pk).update(status=StatusServico.CANCELADO)
        servico.refresh_from_db()
        servico.sincronizar_status()

        ordem.refresh_from_db()
        self.assertEqual(ordem.status, 'cancelada')
        self.assertTrue(ordem.liberada_para_cobranca)


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
    def setUp(self):
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Oculto'), data_venda=timezone.localdate(), valor=100,
            tipo_condicao=TipoCondicao.PARCELADO, quantidade_parcelas=12, vencimento_dias_apos_nota=30,
            dia_vencimento_demais=10, observacao='Parcelado em 12x, já foi pago o sinal via PIX',
        )

    def test_sem_ver_valores_nao_recebe_a_condicao_nem_a_observacao(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))

        detalhe = self.client.get(reverse('ordens-servico-detail', args=[self.ordem.id]))

        for campo in (
            'tipo_condicao', 'vencimento_dias_apos_nota', 'dia_vencimento_demais', 'liberar_em', 'observacao',
            'condicao_resumo',
        ):
            self.assertNotIn(campo, detalhe.data)

    def test_busca_pela_observacao_so_para_quem_ve_valores(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))
        sem_valores = self.client.get(reverse('ordens-servico-list'), {'q': 'PIX'}).data
        self.client.force_authenticate(user=criar_usuario(Perfil.FINANCEIRO))
        com_valores = self.client.get(reverse('ordens-servico-list'), {'q': 'PIX'}).data

        ids = lambda dados: [item['id'] for item in (dados['results'] if isinstance(dados, dict) else dados)]
        self.assertEqual(ids(sem_valores), [])
        self.assertEqual(ids(com_valores), [self.ordem.id])


class ConversaoDoRecorrenteTestCase(APITestCase):
    """A migração 0037 leva para a observação o que sai dos campos antes de removê-los."""

    def test_monta_o_texto_da_condicao_anterior(self):
        class Antiga:
            tipo_condicao = 'recorrente'
            quantidade_parcelas = 24
            valor_mensal = 1500
            intervalo_parcelas_dias = None
            dia_fechamento = 25
            dia_vencimento = 15

        self.assertEqual(
            recorrente._texto(Antiga),
            '[Condição anterior: recorrente em 24 meses de R$ 1.500,00, fecha dia 25, vence dia 15]',
        )

    def test_intervalo_mensal_nao_gera_texto(self):
        class Parcelada:
            tipo_condicao = 'parcelado'
            quantidade_parcelas = 6
            valor_mensal = None
            intervalo_parcelas_dias = 30
            dia_fechamento = None
            dia_vencimento = None

        self.assertEqual(recorrente._texto(Parcelada), '')


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


class ReferenciaDoLancamentoTestCase(APITestCase):
    """A migração 0015 copia o número da NF para a referência; NF 0 (sem número) fica sem referência."""

    def test_copia_o_numero_da_nf(self):
        self.assertEqual(conversao._referencia(2449), '2449')

    def test_nf_zero_fica_sem_referencia(self):
        self.assertIsNone(conversao._referencia(0))
        self.assertIsNone(conversao._referencia(None))
