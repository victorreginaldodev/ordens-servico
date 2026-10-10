from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.contas.models import Usuario
from apps.organizacoes.apoio_testes import Perfil, criar_usuario_com_perfil, setor_padrao
from apps.catalogo.models import Catalogo, CatalogoOperacional
from apps.ordens_servico.models import (
    OrdemServico, OrdemServicoOperacional, Servico, Tarefa, Prioridade,
)
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional
from apps.ordens_servico.models.tarefa import StatusTarefa


class HerancaPrioridadeSerializerTestCase(APITestCase):
    def setUp(self):
        self.usuario = criar_usuario_com_perfil(
            username='gestor_heranca',
            email='heranca@ergogroup.test',
            password='senha-teste-123',
            nome_completo='Gestor Heranca',
            perfil=Perfil.GESTOR_TECNICO,
        )
        self.cliente = Cliente.objects.create(nome='Cliente Heranca')
        self.ordem_servico = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=0, prioridade=Prioridade.ALTA,
        )
        self.client.force_authenticate(user=self.usuario)

    def test_servico_sem_prioridade_no_payload_herda_da_ordem_servico(self):
        url = reverse('servicos-list')
        response = self.client.post(url, {'ordem_servico': self.ordem_servico.pk, 'descricao': 'sem prioridade'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['prioridade'], Prioridade.ALTA)

    def test_servico_com_prioridade_explicita_nao_herda(self):
        url = reverse('servicos-list')
        response = self.client.post(url, {
            'ordem_servico': self.ordem_servico.pk, 'descricao': 'com prioridade', 'prioridade': Prioridade.BAIXA,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['prioridade'], Prioridade.BAIXA)

    def test_mudar_prioridade_da_os_nao_altera_servico_ja_criado(self):
        servico = Servico.objects.create(
            ordem_servico=self.ordem_servico, descricao='ja criado', prioridade=Prioridade.ALTA,
        )
        self.ordem_servico.prioridade = Prioridade.MEDIA
        self.ordem_servico.save()

        servico.refresh_from_db()
        self.assertEqual(servico.prioridade, Prioridade.ALTA)

    def test_tarefa_sem_prioridade_no_payload_herda_do_servico(self):
        servico = Servico.objects.create(
            ordem_servico=self.ordem_servico, descricao='servico pai', prioridade=Prioridade.ALTA,
        )
        url = reverse('tarefas-list')
        response = self.client.post(url, {
            'servico': servico.pk, 'responsavel': self.usuario.pk, 'descricao': 'sem prioridade',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['prioridade'], Prioridade.ALTA)


class TarefaFiltrosTestCase(APITestCase):
    def setUp(self):
        self.usuario = criar_usuario_com_perfil(
            username='tecnico_filtros',
            email='filtros@ergogroup.test',
            password='senha-teste-123',
            nome_completo='Tecnico Filtros',
            perfil=Perfil.GESTOR_TECNICO,
        )
        self.cliente = Cliente.objects.create(nome='Cliente Filtros')
        self.ordem_servico = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=0,
        )
        self.servico = Servico.objects.create(ordem_servico=self.ordem_servico, descricao='servico')

        hoje = timezone.localdate()
        self.tarefa_atrasada = Tarefa.objects.create(
            servico=self.servico, responsavel=self.usuario, descricao='atrasada',
            prazo=hoje - timedelta(days=2), prioridade=Prioridade.ALTA,
        )
        self.tarefa_futura = Tarefa.objects.create(
            servico=self.servico, responsavel=self.usuario, descricao='futura',
            prazo=hoje + timedelta(days=5), prioridade=Prioridade.BAIXA,
        )
        self.client.force_authenticate(user=self.usuario)

    def test_filtro_prioridade(self):
        url = reverse('tarefas-list')
        response = self.client.get(url, {'prioridade': Prioridade.ALTA})

        ids = {item['id'] for item in response.data}
        self.assertEqual(ids, {self.tarefa_atrasada.pk})

    def test_filtro_atrasada_true(self):
        url = reverse('tarefas-list')
        response = self.client.get(url, {'atrasada': 'true'})

        ids = {item['id'] for item in response.data}
        self.assertEqual(ids, {self.tarefa_atrasada.pk})

    def test_filtro_atrasada_deixa_de_contar_apos_concluir(self):
        self.tarefa_atrasada.status = StatusTarefa.CONCLUIDA
        self.tarefa_atrasada.save()

        url = reverse('tarefas-list')
        response = self.client.get(url, {'atrasada': 'true'})

        self.assertEqual(response.data, [])


# As notificações estão desligadas no .env de dev (EMAIL_NOTIFICATIONS_ENABLED); aqui o envio é testado ligado.
@override_settings(EMAIL_NOTIFICATIONS_ENABLED=True)
class NotificacoesEmailTestCase(APITestCase):
    def setUp(self):
        mail.outbox = []
        self.cliente = Cliente.objects.create(nome='Cliente Notificacoes')

        self.gestor_financeiro = criar_usuario_com_perfil(
            username='gestor_financeiro', email='gestor_financeiro@ergogroup.test',
            password='senha-teste-123', nome_completo='Gestor Financeiro',
            perfil=Perfil.GESTOR_FINANCEIRO,
        )
        self.financeiro = criar_usuario_com_perfil(
            username='financeiro', email='financeiro@ergogroup.test',
            password='senha-teste-123', nome_completo='Financeiro',
            perfil=Perfil.FINANCEIRO,
        )
        self.comercial = criar_usuario_com_perfil(
            username='comercial', email='comercial@ergogroup.test',
            password='senha-teste-123', nome_completo='Comercial',
            perfil=Perfil.COMERCIAL,
        )
        self.tecnico = criar_usuario_com_perfil(
            username='tecnico_notif', email='tecnico_notif@ergogroup.test',
            password='senha-teste-123', nome_completo='Tecnico Notif',
            perfil=Perfil.TECNICO,
        )
        self.outro_tecnico = criar_usuario_com_perfil(
            username='outro_tecnico_notif', email='outro_tecnico_notif@ergogroup.test',
            password='senha-teste-123', nome_completo='Outro Tecnico Notif',
            perfil=Perfil.TECNICO,
        )
        self.administrativo = criar_usuario_com_perfil(
            username='administrativo_notif', email='administrativo_notif@ergogroup.test',
            password='senha-teste-123', nome_completo='Administrativo Notif',
            perfil=Perfil.ADMINISTRATIVO,
        )

    def test_atribuicao_de_tarefa_notifica_responsavel(self):
        ordem_servico = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=0,
        )
        servico = Servico.objects.create(ordem_servico=ordem_servico, descricao='servico')

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            tarefa = Tarefa.objects.create(
                servico=servico, responsavel=self.tecnico, descricao='tarefa nova',
            )
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.tecnico.email])

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            tarefa.responsavel = self.outro_tecnico
            tarefa.save()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.outro_tecnico.email])

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            tarefa.descricao = 'sem trocar responsavel'
            tarefa.save()
        self.assertEqual(len(mail.outbox), 0)

    def test_liberacao_automatica_de_cobranca_notifica_financeiro(self):
        ordem_servico = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=500,
        )
        servico = Servico.objects.create(ordem_servico=ordem_servico, descricao='servico')
        tarefa = Tarefa.objects.create(servico=servico, responsavel=self.tecnico, descricao='tarefa')

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            tarefa.status = StatusTarefa.CONCLUIDA
            tarefa.save()

        ordem_servico.refresh_from_db()
        self.assertTrue(ordem_servico.liberada_para_cobranca)

        emails_liberacao = [msg for msg in mail.outbox if 'liberada para cobrança' in msg.subject]
        self.assertEqual(len(emails_liberacao), 1)
        self.assertEqual(set(emails_liberacao[0].to), {self.gestor_financeiro.email, self.financeiro.email})

    def test_cobranca_realizada_na_os_notifica_financeiro_e_comercial(self):
        ordem_servico = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=500,
            liberada_para_cobranca=True,
        )

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            ordem_servico.cobranca_realizada = True
            ordem_servico.referencia_lancamento = 'NF 123'
            ordem_servico.save(update_fields=['cobranca_realizada', 'referencia_lancamento'])

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            set(mail.outbox[0].to),
            {self.gestor_financeiro.email, self.financeiro.email, self.comercial.email},
        )

    def test_liberacao_e_cobranca_realizada_na_os_operacional(self):
        catalogo_operacional = CatalogoOperacional.objects.create(nome='Catalogo Operacional Notif')
        oso = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=catalogo_operacional, responsavel=self.tecnico,
            data_recebimento=timezone.localdate(), revisao_cliente=True,
        )

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            oso.status = StatusOrdemServicoOperacional.FINALIZADA
            oso.save()

        emails_liberacao = [msg for msg in mail.outbox if 'liberada para cobrança' in msg.subject]
        self.assertEqual(len(emails_liberacao), 1)

        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            oso.cobranca_realizada = True
            oso.save()

        emails_cobranca = [msg for msg in mail.outbox if 'cobrança realizada' in msg.subject]
        self.assertEqual(len(emails_cobranca), 1)
        self.assertEqual(
            set(emails_cobranca[0].to),
            {self.gestor_financeiro.email, self.financeiro.email, self.comercial.email},
        )


class ExclusaoProtegidaTestCase(APITestCase):
    def setUp(self):
        self.gestor = criar_usuario_com_perfil(
            username='gestor_exclusao', email='gestor.exclusao@ergogroup.test',
            password='senha-teste-123', nome_completo='Gestor Exclusao',
            perfil=Perfil.DIRETOR,
        )
        self.tecnico = criar_usuario_com_perfil(
            username='tecnico_exclusao', email='tecnico.exclusao@ergogroup.test',
            password='senha-teste-123', nome_completo='Tecnico Exclusao',
            perfil=Perfil.TECNICO,
        )
        self.cliente = Cliente.objects.create(nome='Cliente Exclusao')
        self.catalogo = Catalogo.objects.create(setor=setor_padrao(), nome='Catalogo Exclusao')
        self.ordem_servico = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=0,
        )
        self.client.force_authenticate(user=self.gestor)

    def test_excluir_catalogo_com_servicos_retorna_409_e_preserva_servicos(self):
        servico = Servico.objects.create(
            ordem_servico=self.ordem_servico, catalogo=self.catalogo, descricao='usa catalogo',
        )
        tarefa = Tarefa.objects.create(servico=servico, responsavel=self.tecnico)

        response = self.client.delete(reverse('catalogos-detail', args=[self.catalogo.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('1 serviço', response.data['detail'])
        self.assertEqual(
            response.data['vinculos'],
            [{'modelo': 'servico', 'descricao': 'serviço', 'quantidade': 1}],
        )
        self.assertTrue(Catalogo.objects.filter(id=self.catalogo.id).exists())
        self.assertTrue(Servico.objects.filter(id=servico.id).exists())
        self.assertTrue(Tarefa.objects.filter(id=tarefa.id).exists())

    def test_excluir_catalogo_sem_servicos_continua_permitido(self):
        response = self.client.delete(reverse('catalogos-detail', args=[self.catalogo.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Catalogo.objects.filter(id=self.catalogo.id).exists())

    def test_excluir_usuario_responsavel_retorna_409_com_dica_de_desativacao(self):
        servico = Servico.objects.create(ordem_servico=self.ordem_servico, descricao='servico')
        Tarefa.objects.create(servico=servico, responsavel=self.tecnico)
        Tarefa.objects.create(servico=servico, responsavel=self.tecnico)
        catalogo_operacional = CatalogoOperacional.objects.create(nome='Operacional Exclusao')
        OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=catalogo_operacional, responsavel=self.tecnico,
        )

        response = self.client.delete(reverse('usuarios-detail', args=[self.tecnico.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('2 tarefas', response.data['detail'])
        self.assertIn('1 ordem de serviço operacional', response.data['detail'])
        self.assertIn('Desative o usuário', response.data['detail'])
        self.assertEqual(Tarefa.objects.filter(responsavel=self.tecnico).count(), 2)
        self.assertTrue(Usuario.objects.filter(id=self.tecnico.id).exists())

    def test_excluir_cliente_com_os_retorna_409(self):
        response = self.client.delete(reverse('clientes-detail', args=[self.cliente.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('1 ordem de serviço', response.data['detail'])
        self.assertTrue(Cliente.objects.filter(id=self.cliente.id).exists())
