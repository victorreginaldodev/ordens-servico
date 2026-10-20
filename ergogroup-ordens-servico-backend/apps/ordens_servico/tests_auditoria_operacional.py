"""Auditoria das OS operacionais anteriores à regra do catálogo (20/10/2026)."""
from datetime import date, datetime
from io import BytesIO

from django.urls import reverse
from django.utils import timezone
from openpyxl import load_workbook
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import CatalogoOperacional
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServicoOperacional
from apps.ordens_servico.models.ordem_servico_operacional import RegraDeCobranca, StatusOrdemServicoOperacional as S
from apps.organizacoes.apoio_testes import Perfil, criar_usuario


class AuditoriaOperacionalTestCase(APITestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Antigo')
        self.cliente = Cliente.objects.create(nome='Cliente Antigo', numero_inscricao='12345678000190')
        self.cobravel = CatalogoOperacional.objects.create(nome='Inclusão de função', gera_cobranca=True)
        self.revisao = CatalogoOperacional.objects.create(nome='Revisão PGR - Correção cliente')

    def legado(self, catalogo, **campos):
        dados = {'cliente': self.cliente, 'catalogo_operacional': catalogo, 'responsavel': self.tecnico,
                 'data_recebimento': date(2025, 3, 10), **campos}
        oso = OrdemServicoOperacional.objects.create(**dados)
        # Como uma OSO antiga (criada antes de 20/10/2026) sem "Revisão do cliente": não gerava cobrança.
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(
            regra_de_cobranca=RegraDeCobranca.LEGADO, gera_cobranca=False, data_liberacao_cobranca=None,
            liberada_cobranca_por=None, criada_em=timezone.make_aware(datetime(2025, 3, 10, 9, 0)),
        )
        return oso

    def auditoria(self, usuario=None):
        self.client.force_authenticate(user=usuario or self.diretor)
        return self.client.get(reverse('financeiro-auditoria-operacionais'))

    def test_so_as_anteriores_a_regra_do_catalogo_sem_filtro(self):
        antiga = self.legado(self.revisao, status=S.FINALIZADA)
        OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.cobravel, responsavel=self.tecnico,
        )

        response = self.auditoria()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual([o['id'] for o in response.data['osos']], [antiga.id])
        self.assertEqual(response.data['total'], 1)

    def test_alertas_da_auditoria(self):
        revisao = self.legado(self.revisao, status=S.FINALIZADA, data_termino=date(2025, 3, 12))
        OrdemServicoOperacional.objects.filter(pk=revisao.pk).update(revisao_cliente=True, gera_cobranca=True)
        potencial = self.legado(self.cobravel, status=S.FINALIZADA, data_termino=date(2025, 3, 11))
        cobrada = self.legado(self.revisao, status=S.FINALIZADA, data_termino=date(2025, 3, 11))
        OrdemServicoOperacional.objects.filter(pk=cobrada.pk).update(cobranca_realizada=True, numero_nf='0')
        sem_termino = self.legado(self.revisao, status=S.FINALIZADA, data_recebimento=date(2025, 4, 1))

        dados = {o['id']: o for o in self.auditoria().data['osos']}

        self.assertIn('revisao_sem_cobranca', dados[revisao.id]['alertas'])
        self.assertEqual(dados[revisao.id]['dias_ate_terminar'], 2)
        self.assertEqual(
            (dados[potencial.id]['cobraria_hoje'], dados[potencial.id]['revisao_cliente']), (True, False),
        )
        self.assertIn('catalogo_cobra_nao_cobrada', dados[potencial.id]['alertas'])
        self.assertTrue({'cobrada_sem_gerar', 'cobrada_sem_nf'} <= set(dados[cobrada.id]['alertas']))
        self.assertIn('finalizada_sem_termino', dados[sem_termino.id]['alertas'])
        # Mesmo cliente, serviço, responsável e recebimento: a revisão e a cobrada.
        self.assertIn('possivel_duplicidade', dados[revisao.id]['alertas'])
        self.assertIn('possivel_duplicidade', dados[cobrada.id]['alertas'])
        self.assertNotIn('possivel_duplicidade', dados[potencial.id]['alertas'])
        self.assertNotIn('possivel_duplicidade', dados[sem_termino.id]['alertas'])

    def test_excel_tem_as_quatro_abas_e_todas_as_linhas(self):
        self.legado(self.revisao, status=S.FINALIZADA)
        self.legado(self.cobravel, status=S.EM_ANDAMENTO)
        self.client.force_authenticate(user=self.diretor)

        response = self.client.get(reverse('financeiro-auditoria-operacionais-excel'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('attachment; filename="auditoria-os-operacionais-', response['Content-Disposition'])
        planilha = load_workbook(BytesIO(response.content))
        self.assertEqual(planilha.sheetnames, ['OS operacionais', 'Não cobradas por cliente', 'Não cobradas por mês', 'Resumo por serviço', 'Sobre'])
        aba = planilha['OS operacionais']
        self.assertEqual(aba.max_row, 3)
        cabecalhos = [c.value for c in aba[1]]
        self.assertIn('Cobraria pela regra de hoje', cabecalhos)
        self.assertNotIn('Tipo de cliente', cabecalhos)

    def test_exige_ver_valores_e_auditoria(self):
        tecnico = criar_usuario(Perfil.TECNICO)
        financeiro = criar_usuario(Perfil.FINANCEIRO)

        self.assertEqual(self.auditoria(tecnico).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=tecnico)
        excel = self.client.get(reverse('financeiro-auditoria-operacionais-excel'))
        self.assertEqual(excel.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn(self.auditoria(financeiro).status_code, (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN))

    def test_deveria_ser_cobrada_e_excel_por_cliente(self):
        outro = Cliente.objects.create(nome='Outro Cliente')
        sem_revisao = self.legado(self.cobravel, status=S.FINALIZADA, data_termino=date(2025, 5, 20), quantidade=3)
        com_revisao = self.legado(self.revisao, status=S.FINALIZADA, data_termino=date(2025, 6, 2))
        OrdemServicoOperacional.objects.filter(pk=com_revisao.pk).update(revisao_cliente=True, gera_cobranca=True)
        em_aberto = self.legado(self.cobravel, status=S.EM_ANDAMENTO)
        isento = self.legado(self.cobravel, status=S.FINALIZADA, cliente=outro)
        self.cobravel.clientes_isentos_cobranca.add(outro)

        dados = {o['id']: o for o in self.auditoria().data['osos']}

        self.assertEqual(dados[sem_revisao.id]['deveria_ser_cobrada'], 'catalogo_sem_revisao')
        self.assertEqual(dados[sem_revisao.id]['mes_referencia'], '2025-05')
        self.assertEqual(dados[com_revisao.id]['deveria_ser_cobrada'], 'revisao_sem_cobranca')
        self.assertIsNone(dados[em_aberto.id]['deveria_ser_cobrada'])
        self.assertIsNone(dados[isento.id]['deveria_ser_cobrada'])

        self.client.force_authenticate(user=self.diretor)
        response = self.client.get(reverse('financeiro-auditoria-operacionais-excel'), {'cliente': outro.pk})
        planilha = load_workbook(BytesIO(response.content))
        self.assertEqual(planilha['OS operacionais'].max_row, 2)
        self.assertIn('Não cobradas por cliente', planilha.sheetnames)
        self.assertIn('Não cobradas por mês', planilha.sheetnames)

    def test_criadas_a_partir_do_corte_nao_entram(self):
        antiga = self.legado(self.revisao, status=S.FINALIZADA)
        recente = self.legado(self.revisao, status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=recente.pk).update(
            criada_em=timezone.make_aware(datetime(2026, 10, 20, 0, 0)),
        )

        ids = [o['id'] for o in self.auditoria().data['osos']]

        self.assertEqual(ids, [antiga.id])
