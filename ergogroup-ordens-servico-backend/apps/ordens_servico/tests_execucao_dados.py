from datetime import date, timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroAuditoria
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.servico import MotivoCiencia, StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario


class ExecucaoBase(APITestCase):
    def setUp(self):
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Execução'), data_venda=timezone.localdate(), valor=0,
        )
        self.servico = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR')

    def recarregar(self):
        self.servico.refresh_from_db()
        return self.servico

    def envelhecer(self, dias):
        """Faz o serviço parecer sem movimentação há `dias` dias."""
        Servico.objects.filter(pk=self.servico.pk).update(
            ultima_movimentacao_em=timezone.now() - timedelta(days=dias),
        )
        return self.recarregar()


class PrazoDoServicoTestCase(ExecucaoBase):
    def test_prazo_e_a_maior_data_das_tarefas_nao_canceladas(self):
        Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico, prazo=date(2026, 11, 10))
        Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico, prazo=date(2026, 11, 20))
        Tarefa.objects.create(
            servico=self.servico, responsavel=self.tecnico, prazo=date(2026, 12, 31), status=StatusTarefa.CANCELADA,
        )

        self.assertEqual(self.recarregar().prazo, date(2026, 11, 20))

    def test_sem_tarefas_o_prazo_fica_vazio(self):
        tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico, prazo=date(2026, 11, 10))
        tarefa.delete()

        self.assertIsNone(self.recarregar().prazo)

    def test_prazo_do_servico_nao_e_editavel_pela_api(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.DIRETOR))

        self.client.patch(reverse('servicos-detail', args=[self.servico.id]), {'prazo': '2030-01-01'})

        self.assertIsNone(self.recarregar().prazo)

    def test_servico_nao_expoe_horas_nem_complexidade(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.DIRETOR))

        response = self.client.get(reverse('servicos-detail', args=[self.servico.id]))

        for campo in ('horas_estimadas', 'complexidade', 'horas_estimadas_efetivas', 'complexidade_efetiva'):
            self.assertNotIn(campo, response.data)


class MovimentacaoTestCase(ExecucaoBase):
    def test_criar_tarefa_movimenta_o_servico(self):
        antes = self.envelhecer(10).ultima_movimentacao_em

        Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico)

        self.assertGreater(self.recarregar().ultima_movimentacao_em, antes)

    def test_mudar_status_responsavel_ou_prazo_movimenta(self):
        tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico)
        outro = criar_usuario(Perfil.TECNICO)
        for campo, valor in (('status', StatusTarefa.EM_ANDAMENTO), ('responsavel', outro), ('prazo', date(2026, 12, 1))):
            antes = self.envelhecer(10).ultima_movimentacao_em
            setattr(tarefa, campo, valor)
            tarefa.save()
            self.assertGreater(self.recarregar().ultima_movimentacao_em, antes, campo)

    def test_corrigir_a_descricao_nao_movimenta(self):
        tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico)
        antes = self.envelhecer(10).ultima_movimentacao_em

        tarefa.descricao = 'texto corrigido'
        tarefa.save()

        self.assertEqual(self.recarregar().ultima_movimentacao_em, antes)

    def test_excluir_tarefa_movimenta(self):
        tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico)
        antes = self.envelhecer(10).ultima_movimentacao_em

        tarefa.delete()

        self.assertGreater(self.recarregar().ultima_movimentacao_em, antes)


@override_settings(DIAS_ALERTA_SEM_MOVIMENTACAO=7)
class AlertaSemMovimentacaoTestCase(ExecucaoBase):
    def test_servico_recente_nao_esta_em_alerta(self):
        self.assertFalse(self.envelhecer(6).em_alerta_sem_movimentacao)

    def test_sete_dias_sem_movimentacao_entra_em_alerta(self):
        servico = self.envelhecer(7)

        self.assertTrue(servico.em_alerta_sem_movimentacao)
        self.assertEqual(servico.dias_sem_movimentacao, 7)

    def test_servico_concluido_ou_cancelado_nao_tem_alerta(self):
        self.envelhecer(30)
        Servico.objects.filter(pk=self.servico.pk).update(status=StatusServico.CANCELADO)

        self.assertFalse(self.recarregar().em_alerta_sem_movimentacao)

    def test_ciencia_silencia_o_alerta_e_fica_na_auditoria(self):
        servico = self.envelhecer(10)

        servico.registrar_ciencia(self.tecnico, MotivoCiencia.CLIENTE, 'Esperando a planta do cliente')

        servico = self.recarregar()
        self.assertFalse(servico.em_alerta_sem_movimentacao)
        self.assertTrue(servico.ciencia_vigente)
        self.assertEqual(servico.alerta_ciente_por, self.tecnico)
        self.assertEqual(servico.alerta_ciente_motivo, MotivoCiencia.CLIENTE)
        self.assertTrue(
            RegistroAuditoria.objects.filter(servico_id=servico.pk, acao=AcaoAuditoria.CIENCIA_ALERTA).exists()
        )

    def test_alerta_volta_depois_de_outro_periodo_sem_movimentacao(self):
        servico = self.envelhecer(20)
        servico.registrar_ciencia(self.tecnico)
        Servico.objects.filter(pk=servico.pk).update(alerta_ciente_em=timezone.now() - timedelta(days=8))

        self.assertTrue(self.recarregar().em_alerta_sem_movimentacao)

    def test_movimentacao_depois_da_ciencia_encerra_a_ciencia(self):
        servico = self.envelhecer(10)
        servico.registrar_ciencia(self.tecnico, MotivoCiencia.TERCEIRO)

        Tarefa.objects.create(servico=servico, responsavel=self.tecnico)

        self.assertFalse(self.recarregar().ciencia_vigente)

    def test_api_expoe_o_alerta(self):
        self.envelhecer(9)
        self.client.force_authenticate(user=criar_usuario(Perfil.DIRETOR))

        response = self.client.get(reverse('servicos-detail', args=[self.servico.id]))

        self.assertTrue(response.data['em_alerta_sem_movimentacao'])
        self.assertEqual(response.data['dias_sem_movimentacao'], 9)
