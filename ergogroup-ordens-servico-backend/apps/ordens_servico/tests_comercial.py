from datetime import date
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa, TipoCondicao
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao


class ResumoDaCondicaoTestCase(APITestCase):
    def condicao(self, **campos):
        return OrdemServico(cliente_id=1, data_venda=date(2026, 10, 10), **campos).condicao_resumo

    def test_parcelado(self):
        self.assertEqual(
            self.condicao(tipo_condicao=TipoCondicao.PARCELADO, quantidade_parcelas=6, intervalo_parcelas_dias=30,
                          data_acordada_cobranca=date(2026, 8, 10)),
            'Parcelado em 6x a cada 30 dias, 1º vencimento 10/08/2026',
        )

    def test_recorrente(self):
        self.assertEqual(
            self.condicao(tipo_condicao=TipoCondicao.RECORRENTE, quantidade_parcelas=24,
                          valor_mensal=Decimal('1500.00'), dia_fechamento=25, dia_vencimento=15),
            'Recorrente: 24 meses de R$ 1.500,00, fecha dia 25, vence dia 15',
        )

    def test_a_vista(self):
        self.assertEqual(self.condicao(), 'À vista')
        self.assertEqual(
            self.condicao(data_acordada_cobranca=date(2026, 11, 10)), 'À vista, 1º vencimento 10/11/2026',
        )


class ComercialBase(APITestCase):
    def setUp(self):
        self.comercial = criar_usuario(Perfil.COMERCIAL, nome_completo='Vendedora')
        self.outra_vendedora = criar_usuario(Perfil.COMERCIAL, nome_completo='Outra Vendedora')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Um')
        self.administrativo = criar_usuario(Perfil.ADMINISTRATIVO)
        pgr = Catalogo.objects.create(nome='PGR', setor=setor_padrao())
        cliente = Cliente.objects.create(nome='Cliente Comercial')
        self.ordem = OrdemServico.objects.create(
            cliente=cliente, data_venda=timezone.localdate(), valor=Decimal('36000.00'), criado_por=self.comercial,
            tipo_condicao=TipoCondicao.RECORRENTE, quantidade_parcelas=24, valor_mensal=Decimal('1500.00'),
            dia_vencimento=15,
        )
        self.na_fila = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR', catalogo=pgr)
        self.concluido = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR filial', catalogo=pgr)
        Tarefa.objects.create(servico=self.concluido, responsavel=self.tecnico, status=StatusTarefa.CONCLUIDA)
        self.outra_ordem = OrdemServico.objects.create(
            cliente=cliente, data_venda=timezone.localdate(), valor=100, criado_por=self.outra_vendedora,
        )

    def lista(self, usuario, **params):
        self.client.force_authenticate(user=usuario)
        response = self.client.get(reverse('ordens-servico-list'), params)
        itens = response.data['results'] if isinstance(response.data, dict) else response.data
        return {item['id']: item for item in itens}


class ListaDeVendasTestCase(ComercialBase):
    def test_cada_venda_traz_o_andamento_e_quem_vendeu(self):
        venda = self.lista(self.comercial)[self.ordem.id]

        self.assertEqual(venda['vendido_por_nome'], 'Vendedora')
        self.assertEqual(venda['andamento'], {
            'total': 2, 'na_fila': 1, 'distribuido': 0, 'em_execucao': 0, 'concluido': 1, 'cancelado': 0,
        })
        self.assertEqual(venda['condicao_resumo'], 'Recorrente: 24 meses de R$ 1.500,00, vence dia 15')

    def test_minhas_vendas(self):
        self.assertEqual(set(self.lista(self.comercial, minhas='true')), {self.ordem.id})

    def test_filtra_vendas_com_servico_na_etapa(self):
        self.assertEqual(set(self.lista(self.comercial, etapa='na_fila')), {self.ordem.id})
        self.assertEqual(set(self.lista(self.comercial, etapa='em_execucao')), set())

    def test_quem_nao_ve_valores_nao_recebe_a_condicao(self):
        venda = self.lista(self.administrativo)[self.ordem.id]

        self.assertNotIn('condicao_resumo', venda)
        self.assertNotIn('valor_mensal', venda)
        self.assertIn('andamento', venda)


class ResumoDaVendaTestCase(ComercialBase):
    def resumo(self, usuario, ordem=None):
        self.client.force_authenticate(user=usuario)
        return self.client.get(reverse('comercial-venda', args=[(ordem or self.ordem).id]))

    def test_resumo_completo_para_o_comercial(self):
        response = self.resumo(self.comercial)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dados = response.data
        self.assertEqual(dados['vendido_por_nome'], 'Vendedora')
        self.assertEqual(dados['condicoes']['condicao_resumo'], 'Recorrente: 24 meses de R$ 1.500,00, vence dia 15')
        self.assertEqual(dados['condicoes']['valor_mensal'], '1500.00')
        self.assertFalse(dados['financeiro']['liberada_para_cobranca'])
        servicos = {servico['descricao']: servico for servico in dados['servicos']}
        self.assertEqual(servicos['PGR']['etapa'], 'na_fila')
        self.assertEqual(servicos['PGR filial']['etapa'], 'concluido')
        self.assertEqual(servicos['PGR filial']['setor_nome'], 'Segurança do Trabalho')
        self.assertEqual(servicos['PGR filial']['terminado_por_nome'], 'Técnico Um')
        self.assertEqual(servicos['PGR filial']['responsaveis'][0]['nome'], 'Técnico Um')
        self.assertEqual(servicos['PGR filial']['responsaveis'][0]['data_termino'], timezone.localdate().isoformat())

    def test_sem_ver_valores_o_resumo_vem_sem_condicoes_nem_financeiro(self):
        dados = self.resumo(self.administrativo).data

        self.assertIsNone(dados['condicoes'])
        self.assertIsNone(dados['financeiro'])
        self.assertEqual(len(dados['servicos']), 2)

    def test_tecnico_ve_o_resumo_da_venda_em_que_trabalha(self):
        self.assertEqual(self.resumo(self.tecnico).status_code, status.HTTP_200_OK)
        self.assertEqual(self.resumo(self.tecnico, self.outra_ordem).status_code, status.HTTP_404_NOT_FOUND)
