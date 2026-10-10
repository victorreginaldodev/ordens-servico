import importlib

from django.apps import apps
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import Organizacao, Setor


class CatalogoApiTestCase(APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.COMERCIAL))
        self.seguranca = setor_padrao()

    def test_cria_catalogo_com_setor_responsavel(self):
        response = self.client.post(reverse('catalogos-list'), {'nome': 'LTCAT', 'setor': self.seguranca.id})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['setor_nome'], 'Segurança do Trabalho')
        self.assertTrue(response.data['ativo'])

    def test_setor_responsavel_e_obrigatorio(self):
        response = self.client.post(reverse('catalogos-list'), {'nome': 'LTCAT'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('setor', response.data)

    def test_setor_inativo_e_recusado(self):
        inativo = Setor.objects.create(
            organizacao=Organizacao.objects.get(nome='Ergogroup'), nome='Antigo', ativo=False,
        )

        response = self.client.post(reverse('catalogos-list'), {'nome': 'LTCAT', 'setor': inativo.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('setor', response.data)

    def test_filtro_por_status(self):
        Catalogo.objects.create(nome='Ativo', setor=self.seguranca)
        Catalogo.objects.create(nome='Aposentado', setor=self.seguranca, ativo=False)

        response = self.client.get(reverse('catalogos-list'), {'ativo': 'true'})

        nomes = {c['nome'] for c in (response.data['results'] if isinstance(response.data, dict) else response.data)}
        self.assertIn('Ativo', nomes)
        self.assertNotIn('Aposentado', nomes)


class CatalogoInativoTestCase(APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.DIRETOR))
        self.catalogo = Catalogo.objects.create(nome='PGR antigo', setor=setor_padrao(), ativo=False)
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente'), data_venda=timezone.localdate(), valor=0,
        )

    def test_nao_pode_ser_usado_em_servico_novo(self):
        response = self.client.post(reverse('servicos-list'), {
            'ordem_servico': self.ordem.id, 'catalogo': self.catalogo.id, 'descricao': 'novo',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('catalogo', response.data)

    def test_servico_que_ja_usa_continua_editavel(self):
        servico = Servico.objects.create(ordem_servico=self.ordem, catalogo=self.catalogo, descricao='antigo')

        response = self.client.patch(
            reverse('servicos-detail', args=[servico.id]), {'catalogo': self.catalogo.id, 'descricao': 'ajuste'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_excluir_catalogo_em_uso_sugere_desativar(self):
        Servico.objects.create(ordem_servico=self.ordem, catalogo=self.catalogo, descricao='antigo')

        response = self.client.delete(reverse('catalogos-detail', args=[self.catalogo.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('Desative o catálogo', response.data['detail'])


class PreenchimentoDoSetorDosServicosTestCase(APITestCase):
    def test_servicos_existentes_recebem_o_setor_do_catalogo(self):
        migracao = importlib.import_module('apps.ordens_servico.migrations.0007_preenche_setor_dos_servicos')
        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente'), data_venda=timezone.localdate(), valor=0,
        )
        com_catalogo = Servico.objects.create(
            ordem_servico=ordem, descricao='a', catalogo=Catalogo.objects.create(nome='PGR', setor=setor_padrao()),
        )
        sem_catalogo = Servico.objects.create(ordem_servico=ordem, descricao='b')
        Servico.objects.update(setor=None)  # como estavam os serviços antes da classificação

        migracao.preencher(apps, None)

        com_catalogo.refresh_from_db()
        sem_catalogo.refresh_from_db()
        self.assertEqual(com_catalogo.setor, setor_padrao())
        self.assertIsNone(sem_catalogo.setor)
