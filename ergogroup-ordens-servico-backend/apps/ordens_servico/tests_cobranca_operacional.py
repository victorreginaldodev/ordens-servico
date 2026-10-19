"""OS operacionais nas Cobranças do financeiro (19/10/2026, wireframe `lote7-cobrancas-oso`)."""
from datetime import date, timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import CatalogoOperacional
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServicoOperacional
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional as S
from apps.ordens_servico.services import conferencia
from apps.organizacoes.apoio_testes import Perfil, criar_usuario


@override_settings(DIAS_ALERTA_SEM_LANCAMENTO=3)
class CobrancaOperacionalBase(APITestCase):
    def setUp(self):
        self.hoje = timezone.localdate()
        self.financeiro = criar_usuario(Perfil.FINANCEIRO, nome_completo='Analista Financeira')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Operacional')
        self.cliente = Cliente.objects.create(nome='Cliente Operacional')
        self.cobravel = CatalogoOperacional.objects.create(nome='Revisão PGR - Correção cliente', gera_cobranca=True)
        self.interno = CatalogoOperacional.objects.create(nome='Cadastro no sistema')

    def oso(self, catalogo=None, **campos):
        dados = {'cliente': self.cliente, 'catalogo_operacional': catalogo or self.cobravel,
                 'responsavel': self.tecnico, 'data_recebimento': self.hoje, **campos}
        return OrdemServicoOperacional.objects.create(**dados)

    def cobrancas(self, **params):
        self.client.force_authenticate(user=self.financeiro)
        return self.client.get(reverse('financeiro-cobrancas'), {'situacao': 'todas', **params})

    def registrar(self, oso, **corpo):
        self.client.force_authenticate(user=self.financeiro)
        return self.client.patch(
            reverse('ordens-servico-operacionais-registrar-cobranca', args=[oso.id]), corpo, format='json',
        )


class OperacionaisNasCobrancasTestCase(CobrancaOperacionalBase):
    def test_situacoes_seguem_a_regra_de_cobranca(self):
        a_faturar = self.oso(status=S.FINALIZADA, quantidade=2)
        em_execucao = self.oso(status=S.EM_ANDAMENTO)
        self.oso(catalogo=self.interno, status=S.FINALIZADA)

        response = self.cobrancas()

        situacoes = {l['ordem_servico_operacional_id']: l['situacao'] for l in response.data['operacionais']}
        self.assertEqual(situacoes, {a_faturar.id: 'a_faturar', em_execucao.id: 'previsao'})
        self.assertEqual(response.data['contadores_operacionais'], {'a_faturar': 1, 'faturadas': 0, 'previsao': 1})
        linha = next(l for l in response.data['operacionais'] if l['ordem_servico_operacional_id'] == a_faturar.id)
        self.assertEqual(linha['catalogo_operacional_nome'], 'Revisão PGR - Correção cliente')
        self.assertEqual(linha['quantidade'], 2)
        self.assertEqual(linha['responsavel_nome'], 'Técnico Operacional')
        self.assertIsNotNone(linha['liberada_para_cobranca_em'])

    def test_filtro_de_condicao_e_da_venda_e_tira_as_operacionais(self):
        self.oso(status=S.FINALIZADA)

        response = self.cobrancas(tipo_condicao='a_vista')

        self.assertEqual(response.data['operacionais'], [])

    def test_faturadas_seguem_o_mes_do_lancamento(self):
        oso = self.oso(status=S.FINALIZADA)
        self.registrar(oso, referencia_lancamento='NF 4572', data_cobranca='2026-09-30')

        setembro = self.cobrancas(faturada_de='2026-09-01', faturada_ate='2026-09-30')
        outubro = self.cobrancas(faturada_de='2026-10-01', faturada_ate='2026-10-31')

        self.assertEqual([l['ordem_servico_operacional_id'] for l in setembro.data['operacionais']], [oso.id])
        self.assertEqual(outubro.data['operacionais'], [])

    def test_em_alerta_depois_de_dias_sem_lancamento(self):
        oso = self.oso(status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(
            data_liberacao_cobranca=timezone.now() - timedelta(days=4),
        )

        response = self.cobrancas()

        linha = response.data['operacionais'][0]
        self.assertTrue(linha['em_alerta'])
        self.assertEqual(linha['dias_aguardando_lancamento'], 4)
        self.assertIn('oso_aguardando_lancamento', linha['pendencias'])
        self.assertEqual(response.data['operacionais_em_alerta'], 1)

    def test_sem_permissao_do_financeiro_nao_ve(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.get(reverse('financeiro-cobrancas'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class LancamentoDaOperacionalTestCase(CobrancaOperacionalBase):
    def test_registra_referencia_e_data(self):
        oso = self.oso(status=S.FINALIZADA)

        response = self.registrar(oso, referencia_lancamento=' NF 4572 ', data_cobranca='2026-10-18')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        oso.refresh_from_db()
        self.assertTrue(oso.cobranca_realizada)
        self.assertEqual((oso.referencia_lancamento, oso.data_cobranca), ('NF 4572', date(2026, 10, 18)))
        self.assertEqual(oso.cobranca_realizada_por, self.financeiro)

    def test_sem_data_vale_hoje(self):
        oso = self.oso(status=S.FINALIZADA)

        self.registrar(oso, referencia_lancamento='NF 1')

        oso.refresh_from_db()
        self.assertEqual(oso.data_cobranca, self.hoje)

    def test_nao_liberada_nao_fatura(self):
        oso = self.oso(status=S.EM_ANDAMENTO)

        response = self.registrar(oso, referencia_lancamento='NF 1')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nf_antiga_vira_referencia_na_lista(self):
        oso = self.oso(status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(cobranca_realizada=True, numero_nf='123')

        linha = self.cobrancas().data['operacionais'][0]

        self.assertEqual((linha['situacao'], linha['referencia_lancamento']), ('faturadas', 'NF 123'))


class SituacaoFinanceiraOperacionalTestCase(CobrancaOperacionalBase):
    def test_resumo_para_faturar(self):
        self.cliente.numero_inscricao = '12345678000190'
        self.cliente.tipo_inscricao = 'cnpj'
        self.cliente.save()
        oso = self.oso(status=S.FINALIZADA, descricao='Revisão após inclusão de funções', data_termino=self.hoje)
        self.client.force_authenticate(user=self.financeiro)

        response = self.client.get(reverse('financeiro-operacional', args=[oso.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data['gera_cobranca'])
        self.assertEqual(response.data['cliente']['numero_inscricao'], '12345678000190')
        self.assertEqual(response.data['descricao'], 'Revisão após inclusão de funções')
        tipos = [marco['tipo'] for marco in response.data['historico']]
        self.assertEqual(set(tipos), {'criada', 'finalizada', 'liberacao'})

    def test_tecnico_nao_ve_o_resumo(self):
        oso = self.oso(status=S.FINALIZADA)
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.get(reverse('financeiro-operacional', args=[oso.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ConferenciaDasOperacionaisTestCase(CobrancaOperacionalBase):
    def quantidade(self, codigo):
        return next(v['quantidade'] for v in conferencia.conferencia()['verificacoes'] if v['codigo'] == codigo)

    def test_finalizada_sem_liberacao_e_garantia_e_corrigir_libera(self):
        oso = self.oso(status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(data_liberacao_cobranca=None)

        self.assertEqual(self.quantidade('oso_sync_liberacao'), 1)
        resultado = conferencia.corrigir()

        self.assertEqual(resultado['operacionais_liberadas'], 1)
        self.assertEqual(self.quantidade('oso_sync_liberacao'), 0)

    def test_faturada_com_nf_zero_pede_atencao(self):
        oso = self.oso(status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(cobranca_realizada=True, numero_nf='0')

        self.assertEqual(self.quantidade('oso_sem_referencia'), 1)
        self.registrar(oso, referencia_lancamento='NF 4572')
        self.assertEqual(self.quantidade('oso_sem_referencia'), 0)

    def test_itens_de_oso_nao_tem_ordem_de_servico(self):
        oso = self.oso(status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(cobranca_realizada=True)

        item = next(v for v in conferencia.conferencia()['verificacoes'] if v['codigo'] == 'oso_sem_referencia')['itens'][0]

        self.assertEqual((item['ordem_servico_id'], item['ordem_servico_operacional_id']), (None, oso.id))
