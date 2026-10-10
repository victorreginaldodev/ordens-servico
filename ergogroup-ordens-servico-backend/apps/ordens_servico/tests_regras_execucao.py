from datetime import date

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import Funcao, MembroSetor, Organizacao, Setor
from apps.organizacoes.permissoes import Permissao


class ExecucaoBase(APITestCase):
    def setUp(self):
        self.seguranca = setor_padrao()
        self.gestor_tecnico = criar_usuario(Perfil.GESTOR_TECNICO, email='gestor.tecnico@ergogroup.test')
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.comercial = criar_usuario(Perfil.COMERCIAL)
        self.cliente = Cliente.objects.create(nome='Cliente Regras')
        self.pgr = Catalogo.objects.create(nome='PGR', setor=self.seguranca)
        self.ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=timezone.localdate(), valor=0)
        self.servico = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR', catalogo=self.pgr)


class ResponsavelDoSetorTestCase(ExecucaoBase):
    def distribuir(self, usuario, responsavel, servico=None):
        self.client.force_authenticate(user=usuario)
        return self.client.post(reverse('tarefas-list'), {
            'servico': (servico or self.servico).id, 'responsavel': responsavel.id,
        })

    def test_membro_do_setor_recebe_a_tarefa(self):
        response = self.distribuir(self.gestor_tecnico, self.tecnico)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_quem_nao_e_do_setor_nao_recebe(self):
        response = self.distribuir(self.gestor_tecnico, self.comercial)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('não pertence ao setor "Segurança do Trabalho"', str(response.data['responsavel']))

    def test_diretoria_distribui_em_qualquer_setor_mas_so_para_membros(self):
        diretor = criar_usuario(Perfil.DIRETOR)

        para_membro = self.distribuir(diretor, self.tecnico)
        para_outro_setor = self.distribuir(diretor, self.comercial)

        self.assertEqual(para_membro.status_code, status.HTTP_201_CREATED)
        self.assertEqual(para_outro_setor.status_code, status.HTTP_400_BAD_REQUEST)

    def test_servico_sem_setor_nao_tem_a_restricao(self):
        legado = Servico.objects.create(ordem_servico=self.ordem, descricao='Legado sem catálogo')

        response = self.distribuir(self.gestor_tecnico, self.comercial, servico=legado)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_reatribuir_para_quem_nao_e_do_setor_e_recusado(self):
        tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico)
        self.client.force_authenticate(user=self.gestor_tecnico)

        response = self.client.patch(reverse('tarefas-detail', args=[tarefa.id]), {'responsavel': self.comercial.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tarefa_antiga_de_quem_saiu_do_setor_continua_editavel(self):
        tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.comercial)
        self.client.force_authenticate(user=self.gestor_tecnico)

        response = self.client.patch(
            reverse('tarefas-detail', args=[tarefa.id]), {'status': StatusTarefa.EM_ANDAMENTO},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_quem_nao_distribui_recebe_403_e_nao_400(self):
        response = self.distribuir(self.comercial, self.comercial)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ServicosNaCriacaoDaOSTestCase(ExecucaoBase):
    def setUp(self):
        super().setUp()
        self.financeiro_setor = Setor.objects.get(nome='Financeiro')
        self.auditoria_contabil = Catalogo.objects.create(nome='Auditoria contábil', setor=self.financeiro_setor)
        self.client.force_authenticate(user=self.comercial)

    def vender(self, servicos, **extra):
        return self.client.post(reverse('ordens-servico-list'), {
            'cliente': self.cliente.id, 'data_venda': '2026-10-10', 'valor': '5000.00', 'prioridade': 'alta',
            'servicos': servicos, **extra,
        }, format='json')

    def test_cria_a_os_com_servicos_de_setores_diferentes(self):
        response = self.vender([
            {'catalogo': self.pgr.id, 'descricao': 'PGR da matriz'},
            {'catalogo': self.auditoria_contabil.id, 'descricao': 'Auditoria', 'prioridade': 'baixa'},
        ])

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        servicos = {item['catalogo_nome']: item for item in response.data['servicos']}
        self.assertEqual(servicos['PGR']['setor_nome'], 'Segurança do Trabalho')
        self.assertEqual(servicos['Auditoria contábil']['setor_nome'], 'Financeiro')
        self.assertEqual(servicos['PGR']['prioridade'], 'alta')
        self.assertEqual(servicos['Auditoria contábil']['prioridade'], 'baixa')

    def test_catalogo_inativo_recusa_a_venda_inteira(self):
        self.auditoria_contabil.ativo = False
        self.auditoria_contabil.save()
        total_antes = OrdemServico.objects.count()

        response = self.vender([
            {'catalogo': self.pgr.id, 'descricao': 'PGR'},
            {'catalogo': self.auditoria_contabil.id, 'descricao': 'Auditoria'},
        ])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(OrdemServico.objects.count(), total_antes)

    def test_venda_sem_servicos_continua_valida(self):
        response = self.vender([])

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['servicos'], [])

    def test_na_edicao_os_servicos_sao_somente_leitura(self):
        ordem_id = self.vender([{'catalogo': self.pgr.id, 'descricao': 'PGR'}]).data['id']

        self.client.patch(reverse('ordens-servico-detail', args=[ordem_id]), {
            'servicos': [{'catalogo': self.auditoria_contabil.id, 'descricao': 'Outro'}],
        }, format='json')

        self.assertEqual(Servico.objects.filter(ordem_servico_id=ordem_id).count(), 1)


@override_settings(EMAIL_NOTIFICATIONS_ENABLED=True)
class AvisoDeChegadaTestCase(ServicosNaCriacaoDaOSTestCase):
    def setUp(self):
        super().setUp()
        self.gestor_financeiro = criar_usuario(Perfil.GESTOR_FINANCEIRO, email='gestor.financeiro@ergogroup.test')
        # O Gestor Financeiro não distribui; para o teste, uma função que organiza o Financeiro.
        organiza = Funcao.objects.create(organizacao=self.financeiro_setor.organizacao, nome='Coordenador Financeiro')
        organiza.setores.add(self.financeiro_setor)
        organiza.definir_permissoes([Permissao.SERVICOS_VER_SETOR, Permissao.TAREFAS_DISTRIBUIR])
        self.coordenador = criar_usuario(None, email='coordenador@ergogroup.test')
        MembroSetor.objects.create(usuario=self.coordenador, setor=self.financeiro_setor, funcao=organiza)
        self.diretor = criar_usuario(Perfil.DIRETOR, email='diretor@ergogroup.test')
        mail.outbox = []

    def test_um_email_por_setor_para_quem_o_organiza(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.vender([
                {'catalogo': self.pgr.id, 'descricao': 'PGR'},
                {'catalogo': self.pgr.id, 'descricao': 'PGR filial'},
                {'catalogo': self.auditoria_contabil.id, 'descricao': 'Auditoria'},
            ])

        destinatarios = {msg.subject: set(msg.to) for msg in mail.outbox}
        self.assertEqual(len(mail.outbox), 2)
        seguranca = next(assunto for assunto in destinatarios if 'Segurança do Trabalho' in assunto)
        financeiro = next(assunto for assunto in destinatarios if 'Financeiro' in assunto)
        self.assertIn('2 serviços', seguranca)
        self.assertIn(self.gestor_tecnico.email, destinatarios[seguranca])
        self.assertEqual(destinatarios[financeiro], {self.coordenador.email})
        # A diretoria atua em todos os setores, mas não organiza nenhum: não recebe o aviso.
        self.assertNotIn(self.diretor.email, {email for emails in destinatarios.values() for email in emails})

    def test_servico_acrescentado_depois_avisa_so_o_setor_dele(self):
        with self.captureOnCommitCallbacks(execute=True):
            ordem_id = self.vender([{'catalogo': self.pgr.id, 'descricao': 'PGR'}]).data['id']
        mail.outbox = []

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse('servicos-list'), {
                'ordem_servico': ordem_id, 'catalogo': self.auditoria_contabil.id, 'descricao': 'Auditoria',
            })

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.coordenador.email])

    @override_settings(EMAIL_NOTIFICATIONS_ENABLED=False)
    def test_respeita_o_interruptor_de_emails(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.vender([{'catalogo': self.pgr.id, 'descricao': 'PGR'}])

        self.assertEqual(len(mail.outbox), 0)


class SetorSemOrganizadorTestCase(APITestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.client.force_authenticate(user=self.diretor)
        self.ergonomia = Setor.objects.create(organizacao=Organizacao.objects.get(nome='Ergogroup'), nome='Ergonomia')

    def setor(self, setor):
        return self.client.get(reverse('setores-detail', args=[setor.id])).data

    def test_setor_novo_aparece_sem_organizador(self):
        dados = self.setor(self.ergonomia)

        self.assertTrue(dados['sem_organizador'])
        self.assertEqual(dados['organizadores'], [])

    def test_setor_com_gestor_lista_os_organizadores(self):
        gestor = criar_usuario(Perfil.GESTOR_TECNICO, nome_completo='Gestora Técnica')
        criar_usuario(Perfil.TECNICO)

        dados = self.setor(setor_padrao())

        self.assertFalse(dados['sem_organizador'])
        self.assertIn({'id': gestor.id, 'nome': 'Gestora Técnica'}, dados['organizadores'])
        self.assertEqual(len(dados['organizadores']), 1)

    def test_catalogo_em_setor_sem_organizador_e_aceito_com_aviso(self):
        response = self.client.post(reverse('catalogos-list'), {'nome': 'AET', 'setor': self.ergonomia.id})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['avisos']), 1)
        self.assertIn('Ergonomia', response.data['avisos'][0])

    def test_catalogo_em_setor_organizado_nao_tem_aviso(self):
        criar_usuario(Perfil.GESTOR_TECNICO)

        response = self.client.post(reverse('catalogos-list'), {'nome': 'LTCAT', 'setor': setor_padrao().id})

        self.assertEqual(response.data['avisos'], [])


class SetorNovoDePontaAPontaTestCase(APITestCase):
    """Um setor criado só por configuração percorre o fluxo inteiro, sem nenhuma linha de código própria.
    Se alguma regra passar a depender do nome de um setor, este teste quebra."""

    def test_setor_novo_percorre_o_fluxo_completo(self):
        diretor = criar_usuario(Perfil.DIRETOR)
        ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.client.force_authenticate(user=diretor)

        # Configuração: setor, funções, pessoas e catálogo, tudo pela API.
        setor = self.client.post(reverse('setores-list'), {'organizacao': ergogroup.id, 'nome': 'Ergonomia'}).data
        coordenacao = self.client.post(reverse('funcoes-list'), {
            'organizacao': ergogroup.id, 'nome': 'Coordenador de Ergonomia', 'setores': [setor['id']],
            'permissoes': [Permissao.SERVICOS_VER_SETOR, Permissao.TAREFAS_DISTRIBUIR, Permissao.TAREFAS_EDITAR_SETOR],
        }, format='json').data
        execucao = self.client.post(reverse('funcoes-list'), {
            'organizacao': ergogroup.id, 'nome': 'Ergonomista', 'setores': [setor['id']], 'permissoes': [],
        }, format='json').data
        coordenadora = criar_usuario(None)
        ergonomista = criar_usuario(None)
        for usuario, funcao in ((coordenadora, coordenacao), (ergonomista, execucao)):
            resposta = self.client.post(reverse('membros-setor-list'), {
                'usuario': usuario.id, 'setor': setor['id'], 'funcao': funcao['id'],
            })
            self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        catalogo = self.client.post(reverse('catalogos-list'), {'nome': 'AET', 'setor': setor['id']}).data
        self.assertEqual(catalogo['avisos'], [])

        # Venda pelo comercial.
        self.client.force_authenticate(user=criar_usuario(Perfil.COMERCIAL))
        venda = self.client.post(reverse('ordens-servico-list'), {
            'cliente': Cliente.objects.create(nome='Cliente Ergonomia').id, 'data_venda': '2026-10-10',
            'valor': '3000.00', 'servicos': [{'catalogo': catalogo['id'], 'descricao': 'AET da fábrica'}],
        }, format='json').data
        servico_id = venda['servicos'][0]['id']
        self.assertEqual(venda['servicos'][0]['setor_nome'], 'Ergonomia')

        # A coordenadora vê o serviço e distribui para a ergonomista.
        self.client.force_authenticate(user=coordenadora)
        visiveis = self.client.get(reverse('servicos-list'), {'setor': setor['id']}).data
        itens = visiveis['results'] if isinstance(visiveis, dict) else visiveis
        self.assertEqual([item['id'] for item in itens], [servico_id])
        tarefa = self.client.post(reverse('tarefas-list'), {
            'servico': servico_id, 'responsavel': ergonomista.id, 'prazo': '2026-10-31',
        })
        self.assertEqual(tarefa.status_code, status.HTTP_201_CREATED, tarefa.data)

        # A ergonomista executa e conclui.
        self.client.force_authenticate(user=ergonomista)
        for novo_status in (StatusTarefa.EM_ANDAMENTO, StatusTarefa.CONCLUIDA):
            resposta = self.client.patch(reverse('tarefas-detail', args=[tarefa.data['id']]), {'status': novo_status})
            self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)

        # O serviço e a OS concluem e a OS é liberada para o financeiro.
        servico = Servico.objects.get(pk=servico_id)
        ordem = servico.ordem_servico
        self.assertEqual(servico.status, 'concluida')
        self.assertEqual(servico.prazo, date(2026, 10, 31))
        self.assertEqual(servico.terminado_por, ergonomista)
        self.assertEqual(ordem.status, 'concluida')
        self.assertTrue(ordem.liberada_para_cobranca)
