from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.organizacoes.apoio_testes import Perfil, criar_usuario


class ClienteListagemTestCase(APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.COMERCIAL))

    def test_listagem_traz_os_campos_da_tabela_de_clientes(self):
        Cliente.objects.create(
            nome='Metalúrgica Paraná', tipo_inscricao='cnpj', numero_inscricao='12345678000190',
            tipo_cliente='gestao', nome_representante='Mariana Souza', setor_representante='RH',
            email_representante='mariana@metalurgica.com.br', contato_representante='41999990000',
            cobranca_revisao_alteracao=False,
        )

        response = self.client.get(reverse('clientes-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        linhas = response.data['results'] if isinstance(response.data, dict) else response.data
        cliente = next(c for c in linhas if c['nome'] == 'Metalúrgica Paraná')
        self.assertEqual(cliente['tipo_inscricao'], 'cnpj')
        self.assertEqual(cliente['nome_representante'], 'Mariana Souza')
        self.assertEqual(cliente['setor_representante'], 'RH')
        self.assertEqual(cliente['email_representante'], 'mariana@metalurgica.com.br')
        self.assertEqual(cliente['contato_representante'], '41999990000')
        self.assertFalse(cliente['cobranca_revisao_alteracao'])
        self.assertTrue(cliente['ativo'])
        self.assertIn('data_criacao', cliente)

    def test_listagem_filtra_por_tipo_e_situacao(self):
        Cliente.objects.create(nome='Gestão ativa', tipo_cliente='gestao')
        Cliente.objects.create(nome='Avulso inativo', tipo_cliente='avulso', ativo=False)

        response = self.client.get(reverse('clientes-list'), {'tipo': 'avulso', 'ativo': 'false'})

        nomes = {c['nome'] for c in response.data}
        self.assertEqual(nomes, {'Avulso inativo'})
