"""Notificações por e-mail (ADR 0010): um e-mail por pessoa por ação, nunca para quem fez a ação, faturada só
para o vendedor, liberação com o resumo da execução e resumo diário de pendências."""
from datetime import timedelta
from io import StringIO

from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.auditoria.context import auditoria_context
from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.emails import notificar_chegada_aos_setores
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.ordem_servico import LiberarEm
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.services import resumo_diario
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao


@override_settings(EMAIL_NOTIFICATIONS_ENABLED=True)
class NotificacoesBase(APITestCase):
    def setUp(self):
        self.seguranca = setor_padrao()
        self.gestor = criar_usuario(Perfil.GESTOR_TECNICO, nome_completo='Gestor Técnico')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Um')
        self.outro_tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Dois')
        self.comercial = criar_usuario(Perfil.COMERCIAL, nome_completo='Vendedor')
        self.financeiro = criar_usuario(Perfil.FINANCEIRO, nome_completo='Financeiro')
        self.cliente = Cliente.objects.create(nome='Cliente Notificações')
        self.pgr = Catalogo.objects.create(nome='PGR', setor=self.seguranca)
        self.ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=1000, criado_por=self.comercial,
        )
        self.servico = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR', catalogo=self.pgr)
        mail.outbox = []

    def distribuir(self, por, tarefas):
        self.client.force_authenticate(user=por)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse('execucao-distribuir', args=[self.servico.id]), {'tarefas': tarefas}, format='json',
            )
        self.assertEqual(response.status_code, 201, response.data)
        return response


class DistribuicaoTestCase(NotificacoesBase):
    def test_um_email_por_pessoa_com_todas_as_tarefas_dela(self):
        self.distribuir(self.gestor, [
            {'responsavel': self.tecnico.id, 'descricao': 'Campo'},
            {'responsavel': self.tecnico.id, 'descricao': 'Relatório'},
            {'responsavel': self.outro_tecnico.id, 'descricao': 'Revisão'},
        ])

        por_destinatario = {msg.to[0]: msg for msg in mail.outbox}
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('2 tarefas novas', por_destinatario[self.tecnico.email].subject)
        html = por_destinatario[self.tecnico.email].alternatives[0][0]
        self.assertIn('Campo', html)
        self.assertIn('Relatório', html)
        self.assertIn('Nova tarefa', por_destinatario[self.outro_tecnico.email].subject)

    def test_quem_distribui_para_si_nao_recebe_email(self):
        self.distribuir(self.gestor, [{'responsavel': self.gestor.id}])

        self.assertEqual(mail.outbox, [])

    def test_reatribuir_avisa_so_o_novo_responsavel(self):
        self.distribuir(self.gestor, [{'responsavel': self.tecnico.id}])
        tarefa = Tarefa.objects.get(servico=self.servico)
        mail.outbox = []

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                reverse('tarefas-detail', args=[tarefa.id]), {'responsavel': self.outro_tecnico.id}, format='json',
            )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([msg.to for msg in mail.outbox], [[self.outro_tecnico.email]])


class ChegadaTestCase(NotificacoesBase):
    def test_quem_registrou_nao_recebe_o_aviso_de_chegada(self):
        self.assertIn(self.gestor, self.seguranca.organizadores())

        notificar_chegada_aos_setores([self.servico], por=self.gestor)

        self.assertNotIn(self.gestor.email, {email for msg in mail.outbox for email in msg.to})


class LiberacaoTestCase(NotificacoesBase):
    def test_liberacao_na_conclusao_traz_o_resumo_da_execucao(self):
        self.distribuir(self.gestor, [{'responsavel': self.tecnico.id}])
        tarefa = Tarefa.objects.get(servico=self.servico)
        mail.outbox = []

        self.client.force_authenticate(user=self.tecnico)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                reverse('tarefas-detail', args=[tarefa.id]), {'status': StatusTarefa.CONCLUIDA}, format='json',
            )

        self.assertEqual(response.status_code, 200, response.data)
        liberacao = [msg for msg in mail.outbox if 'liberada para cobrança' in msg.subject]
        self.assertEqual(len(liberacao), 1)
        self.assertIn(self.financeiro.email, liberacao[0].to)
        html = liberacao[0].alternatives[0][0]
        self.assertIn('Quem trabalhou', html)
        self.assertIn('Técnico Um', html)
        self.assertIn('Dias parada', html)

    def test_liberacao_na_venda_sai_sem_resumo_da_execucao(self):
        with self.captureOnCommitCallbacks(execute=True):
            OrdemServico.objects.create(
                cliente=self.cliente, data_venda=timezone.localdate(), valor=500,
                liberar_em=LiberarEm.VENDA, criado_por=self.comercial,
            )

        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn('Quem trabalhou', mail.outbox[0].alternatives[0][0])


class FaturadaTestCase(NotificacoesBase):
    def faturar(self):
        self.ordem.liberada_para_cobranca = True
        self.ordem.save(update_fields=['liberada_para_cobranca'])
        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            self.ordem.registrar_lancamento('NF 10', timezone.localdate(), por=self.financeiro)

    def test_avisa_so_o_vendedor(self):
        self.faturar()

        self.assertEqual([msg.to for msg in mail.outbox], [[self.comercial.email]])
        self.assertIn('faturada', mail.outbox[0].subject)

    def test_vendedor_que_fatura_nao_recebe(self):
        with auditoria_context(usuario=self.comercial):
            self.faturar()

        self.assertEqual(mail.outbox, [])


class ResumoDiarioTestCase(NotificacoesBase):
    def test_sem_pendencias_nao_envia_nada(self):
        call_command('enviar_resumo_diario', stdout=StringIO())

        self.assertEqual(mail.outbox, [])

    def test_servico_sem_distribuir_vai_para_quem_organiza_o_setor(self):
        Servico.objects.filter(pk=self.servico.pk).update(criado_em=timezone.now() - timedelta(days=5))

        enviados = resumo_diario.enviar_resumos()

        self.assertEqual(enviados, 1)
        self.assertEqual(mail.outbox[0].to, [self.gestor.email])
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('Sem ciência ou sem distribuição', html)
        self.assertIn(f'#{self.ordem.id}', html)

    def test_servico_parado_entra_uma_vez_so(self):
        antigo = timezone.now() - timedelta(days=10)
        Servico.objects.filter(pk=self.servico.pk).update(criado_em=antigo, ultima_movimentacao_em=antigo)

        pendencias = resumo_diario.pendencias_por_pessoa()[self.gestor.pk]['setores'][0]

        self.assertEqual(len(pendencias['sem_distribuir']), 1)
        self.assertEqual(pendencias['parados'], [])

    def test_os_liberada_sem_faturar_vai_para_o_financeiro(self):
        OrdemServico.objects.filter(pk=self.ordem.pk).update(
            liberada_para_cobranca=True, liberada_para_cobranca_em=timezone.now() - timedelta(days=5),
        )

        resumo_diario.enviar_resumos()

        para_financeiro = [msg for msg in mail.outbox if self.financeiro.email in msg.to]
        self.assertEqual(len(para_financeiro), 1)
        self.assertIn('sem faturar', para_financeiro[0].alternatives[0][0])

    @override_settings(EMAIL_NOTIFICATIONS_ENABLED=False)
    def test_respeita_o_interruptor_de_emails(self):
        Servico.objects.filter(pk=self.servico.pk).update(criado_em=timezone.now() - timedelta(days=5))

        self.assertEqual(resumo_diario.enviar_resumos(), 0)
        self.assertEqual(mail.outbox, [])
