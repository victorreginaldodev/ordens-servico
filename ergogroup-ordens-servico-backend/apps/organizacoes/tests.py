from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.contas.models import Usuario
from apps.organizacoes.apoio_testes import Perfil, criar_usuario_com_perfil
from apps.ordens_servico.models import OrdemServico, Servico
from apps.organizacoes.models import Organizacao, Setor



def ergogroup():
    return Organizacao.objects.get(nome='Ergogroup')


class SetorViewSetTestCase(APITestCase):
    def setUp(self):
        self.gestor = criar_usuario_com_perfil(
            username='gestor_setor', email='gestor.setor@ergogroup.test',
            password='senha-teste-123', nome_completo='Gestor Setor',
            perfil=Perfil.DIRETOR,
        )
        self.tecnico = criar_usuario_com_perfil(
            username='tecnico_setor', email='tecnico.setor@ergogroup.test',
            password='senha-teste-123', nome_completo='Tecnico Setor',
            perfil=Perfil.TECNICO,
        )
        self.ergonomia = Setor.objects.create(organizacao=ergogroup(), nome='Ergonomia')
        self.inativo = Setor.objects.create(organizacao=ergogroup(), nome='Setor Antigo', ativo=False)

    def test_gestor_cria_setor(self):
        self.client.force_authenticate(user=self.gestor)

        response = self.client.post(reverse('setores-list'), {'organizacao': ergogroup().id, 'nome': 'Engenharia'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Setor.objects.get(nome='Engenharia').ativo)

    def test_nome_de_setor_e_unico(self):
        self.client.force_authenticate(user=self.gestor)

        response = self.client.post(reverse('setores-list'), {'organizacao': ergogroup().id, 'nome': 'Ergonomia'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)

    def test_tecnico_lista_mas_nao_altera_setores(self):
        self.client.force_authenticate(user=self.tecnico)

        listagem = self.client.get(reverse('setores-list'))
        criacao = self.client.post(reverse('setores-list'), {'organizacao': ergogroup().id, 'nome': 'Medicina'})
        exclusao = self.client.delete(reverse('setores-detail', args=[self.ergonomia.id]))

        self.assertEqual(listagem.status_code, status.HTTP_200_OK)
        self.assertEqual(criacao.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(exclusao.status_code, status.HTTP_403_FORBIDDEN)

    def test_filtro_ativo(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.get(reverse('setores-list'), {'ativo': 'true'})

        nomes = [s['nome'] for s in response.data]
        self.assertIn('Ergonomia', nomes)
        self.assertNotIn('Setor Antigo', nomes)

    def test_excluir_setor_em_uso_retorna_409(self):
        Catalogo.objects.create(nome='AET', setor=self.ergonomia)
        self.client.force_authenticate(user=self.gestor)

        response = self.client.delete(reverse('setores-detail', args=[self.ergonomia.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('1 catálogo', response.data['detail'])
        self.assertIn('Desative o setor', response.data['detail'])
        self.assertTrue(Setor.objects.filter(id=self.ergonomia.id).exists())


class SetorDoServicoTestCase(APITestCase):
    def setUp(self):
        self.usuario = criar_usuario_com_perfil(
            username='comercial_setor', email='comercial.setor@ergogroup.test',
            password='senha-teste-123', nome_completo='Comercial Setor',
            perfil=Perfil.COMERCIAL,
        )
        self.ergonomia = Setor.objects.create(organizacao=ergogroup(), nome='Ergonomia')
        self.seguranca = Setor.objects.create(organizacao=ergogroup(), nome='Engenharia')
        self.catalogo_aet = Catalogo.objects.create(nome='AET', setor=self.ergonomia)
        self.catalogo_pgr = Catalogo.objects.create(nome='PGR', setor=self.seguranca)
        self.ordem_servico = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Setor'),
            data_venda=timezone.localdate(), valor=0,
        )
        self.client.force_authenticate(user=self.usuario)

    def test_servico_criado_pela_api_recebe_setor_do_catalogo(self):
        response = self.client.post(reverse('servicos-list'), {
            'ordem_servico': self.ordem_servico.id,
            'catalogo': self.catalogo_aet.id,
            'descricao': 'AET da linha 1',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['setor'], self.ergonomia.id)
        self.assertEqual(response.data['setor_nome'], 'Ergonomia')

    def test_setor_enviado_na_api_e_ignorado(self):
        response = self.client.post(reverse('servicos-list'), {
            'ordem_servico': self.ordem_servico.id,
            'catalogo': self.catalogo_aet.id,
            'setor': self.seguranca.id,
            'descricao': 'tenta forçar setor',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Servico.objects.get(id=response.data['id']).setor, self.ergonomia)

    def test_mudar_setor_do_catalogo_nao_altera_servicos_existentes(self):
        servico = Servico.objects.create(
            ordem_servico=self.ordem_servico, catalogo=self.catalogo_aet, descricao='historico',
        )
        self.catalogo_aet.setor = self.seguranca
        self.catalogo_aet.save()

        servico.descricao = 'editado depois'
        servico.save()

        servico.refresh_from_db()
        self.assertEqual(servico.setor, self.ergonomia)

    def test_trocar_catalogo_do_servico_atualiza_setor(self):
        servico = Servico.objects.create(
            ordem_servico=self.ordem_servico, catalogo=self.catalogo_aet, descricao='troca',
        )

        servico.catalogo = self.catalogo_pgr
        servico.save()

        servico.refresh_from_db()
        self.assertEqual(servico.setor, self.seguranca)

    def test_servico_sem_catalogo_fica_sem_setor(self):
        servico = Servico.objects.create(ordem_servico=self.ordem_servico, descricao='avulso')

        self.assertIsNone(servico.setor)

    def test_filtro_de_servicos_por_setor(self):
        Servico.objects.create(ordem_servico=self.ordem_servico, catalogo=self.catalogo_aet, descricao='a')
        Servico.objects.create(ordem_servico=self.ordem_servico, catalogo=self.catalogo_pgr, descricao='b')

        response = self.client.get(reverse('servicos-list'), {'setor': self.seguranca.id})

        resultados = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertEqual([s['descricao'] for s in resultados], ['b'])


class OrganizacaoViewSetTestCase(APITestCase):
    def setUp(self):
        self.gestor = criar_usuario_com_perfil(
            username='gestor_org', email='gestor.org@ergogroup.test',
            password='senha-teste-123', nome_completo='Gestor Org',
            perfil=Perfil.DIRETOR,
        )
        self.tecnico = criar_usuario_com_perfil(
            username='tecnico_org', email='tecnico.org@ergogroup.test',
            password='senha-teste-123', nome_completo='Tecnico Org',
            perfil=Perfil.TECNICO,
        )
        self.ergogroup = Organizacao.objects.get(nome='Ergogroup')

    def test_migracao_cria_organizacao_ergogroup(self):
        self.assertEqual(Organizacao.objects.count(), 1)

    def test_gestor_atualiza_dados_da_organizacao(self):
        self.client.force_authenticate(user=self.gestor)

        response = self.client.patch(
            reverse('organizacoes-detail', args=[self.ergogroup.id]),
            {'razao_social': 'Ergogroup Ltda', 'cidade': 'Curitiba', 'uf': 'PR'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ergogroup.refresh_from_db()
        self.assertEqual(self.ergogroup.razao_social, 'Ergogroup Ltda')
        self.assertEqual(self.ergogroup.uf, 'PR')

    def test_tecnico_le_mas_nao_altera_organizacao(self):
        self.client.force_authenticate(user=self.tecnico)

        leitura = self.client.get(reverse('organizacoes-detail', args=[self.ergogroup.id]))
        alteracao = self.client.patch(
            reverse('organizacoes-detail', args=[self.ergogroup.id]), {'nome': 'Outro nome'},
        )

        self.assertEqual(leitura.status_code, status.HTTP_200_OK)
        self.assertEqual(alteracao.status_code, status.HTTP_403_FORBIDDEN)

    def test_organizacao_nao_pode_ser_excluida_pela_api(self):
        self.client.force_authenticate(user=self.gestor)

        response = self.client.delete(reverse('organizacoes-detail', args=[self.ergogroup.id]))

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Organizacao.objects.filter(id=self.ergogroup.id).exists())
