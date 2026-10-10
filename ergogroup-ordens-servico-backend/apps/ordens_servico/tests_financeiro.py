from datetime import date, timedelta
from decimal import Decimal

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import LiberarEm, OrdemServico, Servico, Tarefa, TipoCondicao
from apps.ordens_servico.models.ordem_servico import Status
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao


@override_settings(DIAS_ALERTA_SEM_LANCAMENTO=3)
class FinanceiroBase(APITestCase):
    def setUp(self):
        self.hoje = timezone.localdate()
        self.financeiro = criar_usuario(Perfil.FINANCEIRO, nome_completo='Analista Financeira')
        self.comercial = criar_usuario(Perfil.COMERCIAL, nome_completo='Vendedora')
        self.administrativo = criar_usuario(Perfil.ADMINISTRATIVO)
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.cliente = Cliente.objects.create(nome='Cliente Financeiro')
        self.outro_cliente = Cliente.objects.create(nome='Outro Cliente')
        pgr = Catalogo.objects.create(nome='PGR', setor=setor_padrao())

        def venda(**campos):
            dados = {'cliente': self.cliente, 'data_venda': self.hoje, 'valor': Decimal('1000.00'),
                     'criado_por': self.comercial, **campos}
            return OrdemServico.objects.create(**dados)

        self.a_faturar_antiga = venda(
            liberar_em=LiberarEm.VENDA, tipo_condicao=TipoCondicao.PARCELADO, quantidade_parcelas=3,
            data_acordada_cobranca=date(2026, 11, 10), valor=Decimal('3000.00'),
        )
        OrdemServico.objects.filter(pk=self.a_faturar_antiga.pk).update(
            liberada_para_cobranca_em=timezone.now() - timedelta(days=5),
        )
        self.a_faturar_nova = venda(liberar_em=LiberarEm.VENDA, cliente=self.outro_cliente)
        self.faturada = venda(liberar_em=LiberarEm.VENDA)
        self.faturada.registrar_lancamento('NF 4567', self.hoje, por=self.financeiro)

        self.previsao_quase = venda(
            tipo_condicao=TipoCondicao.RECORRENTE, quantidade_parcelas=12, valor_mensal=Decimal('1500.00'),
            dia_vencimento=15, valor=Decimal('18000.00'),
        )
        # Os dois serviços antes de concluir: com um só, a OS concluiria e seria liberada (em definitivo).
        feito = Servico.objects.create(ordem_servico=self.previsao_quase, descricao='PGR', catalogo=pgr)
        Servico.objects.create(ordem_servico=self.previsao_quase, descricao='PGR filial', catalogo=pgr)
        Tarefa.objects.create(servico=feito, responsavel=self.tecnico, status=StatusTarefa.CONCLUIDA)
        self.previsao_nada = venda()
        Servico.objects.create(ordem_servico=self.previsao_nada, descricao='PGR', catalogo=pgr)
        self.cancelada = venda(
            tipo_condicao=TipoCondicao.RECORRENTE, quantidade_parcelas=6, valor_mensal=Decimal('999.00'),
            dia_vencimento=5,
        )
        OrdemServico.objects.filter(pk=self.cancelada.pk).update(status=Status.CANCELADA)

    def cobrancas(self, usuario=None, **params):
        self.client.force_authenticate(user=usuario or self.financeiro)
        return self.client.get(reverse('financeiro-cobrancas'), params)

    def ids(self, response):
        return [linha['ordem_servico_id'] for linha in response.data['ordens']]


class CobrancasTestCase(FinanceiroBase):
    def test_a_faturar_e_o_padrao_com_as_mais_antigas_primeiro(self):
        response = self.cobrancas()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['situacao'], 'a_faturar')
        self.assertEqual(self.ids(response), [self.a_faturar_antiga.id, self.a_faturar_nova.id])

    def test_linha_traz_o_necessario_para_faturar(self):
        linha = self.cobrancas().data['ordens'][0]

        self.assertEqual(linha['condicao_resumo'], 'Parcelado em 3x a cada 30 dias, 1º vencimento 10/11/2026')
        self.assertEqual(linha['vendido_por_nome'], 'Vendedora')
        self.assertEqual(linha['liberar_em'], 'venda')
        self.assertEqual(linha['dias_aguardando_lancamento'], 5)
        self.assertTrue(linha['em_alerta'])

    def test_contadores_das_tres_situacoes(self):
        contadores = self.cobrancas().data['contadores']

        self.assertEqual(contadores['a_faturar'], {'quantidade': 2, 'valor': '4000.00'})
        self.assertEqual(contadores['faturadas'], {'quantidade': 1, 'valor': '1000.00'})
        # A cancelada não entra na previsão.
        self.assertEqual(contadores['previsao'], {'quantidade': 2, 'valor': '19000.00'})

    def test_alerta_de_liberada_sem_lancamento(self):
        response = self.cobrancas(em_alerta='true')

        self.assertEqual(response.data['em_alerta'], 1)
        self.assertEqual(self.ids(response), [self.a_faturar_antiga.id])

    def test_faturadas_trazem_o_lancamento(self):
        linha = self.cobrancas(situacao='faturadas').data['ordens'][0]

        self.assertEqual(linha['referencia_lancamento'], 'NF 4567')
        self.assertEqual(linha['origem_lancamento'], 'manual')
        self.assertEqual(linha['cobranca_realizada_por_nome'], 'Analista Financeira')

    def test_previsao_mostra_primeiro_a_mais_perto_de_liberar(self):
        response = self.cobrancas(situacao='previsao')

        self.assertEqual(self.ids(response), [self.previsao_quase.id, self.previsao_nada.id])
        self.assertEqual(response.data['ordens'][0]['andamento']['concluido'], 1)

    def test_filtros(self):
        self.assertEqual(self.ids(self.cobrancas(tipo_condicao='parcelado')), [self.a_faturar_antiga.id])
        self.assertEqual(self.ids(self.cobrancas(cliente=self.outro_cliente.id)), [self.a_faturar_nova.id])
        self.assertEqual(self.cobrancas(situacao='outra').status_code, status.HTTP_400_BAD_REQUEST)

    def test_exige_registrar_cobranca(self):
        for usuario in (self.comercial, self.administrativo):
            self.assertEqual(self.cobrancas(usuario).status_code, status.HTTP_403_FORBIDDEN)


class SituacaoFinanceiraTestCase(FinanceiroBase):
    def situacao(self, usuario, ordem):
        self.client.force_authenticate(user=usuario)
        return self.client.get(reverse('financeiro-ordem', args=[ordem.id]))

    def test_eventos_de_venda_liberacao_e_lancamento(self):
        response = self.situacao(self.financeiro, self.faturada)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([evento['tipo'] for evento in response.data['eventos']], ['venda', 'liberacao', 'lancamento'])
        self.assertEqual(response.data['eventos'][2]['texto'], 'Faturada (ref. NF 4567)')
        self.assertEqual(response.data['situacao'], 'faturadas')

    def test_quem_ve_valores_acessa_e_os_demais_nao(self):
        self.assertEqual(self.situacao(self.comercial, self.previsao_quase).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.situacao(self.administrativo, self.previsao_quase).status_code, status.HTTP_403_FORBIDDEN,
        )

    def test_servicos_com_a_etapa(self):
        servicos = self.situacao(self.financeiro, self.previsao_quase).data['servicos']

        self.assertEqual(sorted(servico['etapa'] for servico in servicos), ['concluido', 'na_fila'])


class IndicadoresFinanceirosTestCase(FinanceiroBase):
    def test_faturamento_por_tipo_e_receita_recorrente(self):
        self.client.force_authenticate(user=self.financeiro)

        dados = self.client.get(reverse('analise-financeiro')).data

        self.assertEqual(Decimal(dados['total_previsao']), Decimal('19000.00'))
        self.assertEqual(Decimal(dados['por_tipo_condicao']['parcelado']['a_faturar']), Decimal('3000.00'))
        self.assertEqual(Decimal(dados['por_tipo_condicao']['recorrente']['previsao']), Decimal('18000.00'))
        # A recorrente cancelada não conta na receita recorrente.
        self.assertEqual(Decimal(dados['receita_recorrente_mensal']), Decimal('1500.00'))
        self.assertEqual(dados['recorrentes_ativos'], 1)
