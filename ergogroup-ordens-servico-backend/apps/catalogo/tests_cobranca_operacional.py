from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import CatalogoOperacional
from apps.clientes.models import Cliente
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import Funcao, FuncaoPermissao, Organizacao
from apps.organizacoes.permissoes import Permissao
from apps.ordens_servico.models import OrdemServicoOperacional


class RegraDeCobrancaDoCatalogoOperacionalTestCase(APITestCase):
    def setUp(self):
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.cliente = Cliente.objects.create(nome='Cliente padrão')
        self.cliente_isento = Cliente.objects.create(nome='Cliente isento')
        self.catalogo = CatalogoOperacional.objects.create(nome='Revisão', gera_cobranca=True)
        self.catalogo.clientes_isentos_cobranca.add(self.cliente_isento)

    def criar_oso(self, cliente):
        return OrdemServicoOperacional.objects.create(
            cliente=cliente,
            catalogo_operacional=self.catalogo,
            responsavel=self.tecnico,
        )

    def test_nova_oso_fotografa_regra_cobravel_do_catalogo(self):
        oso = self.criar_oso(self.cliente)

        self.assertTrue(oso.gera_cobranca)

    def test_cliente_na_lista_de_excecoes_nao_gera_cobranca(self):
        oso = self.criar_oso(self.cliente_isento)

        self.assertFalse(oso.gera_cobranca)

    def test_catalogo_nao_cobravel_nao_gera_cobranca(self):
        self.catalogo.gera_cobranca = False
        self.catalogo.save(update_fields=['gera_cobranca'])

        oso = self.criar_oso(self.cliente)

        self.assertFalse(oso.gera_cobranca)

    def test_mudanca_da_regra_nao_altera_oso_existente(self):
        oso = self.criar_oso(self.cliente)
        self.catalogo.gera_cobranca = False
        self.catalogo.save(update_fields=['gera_cobranca'])

        oso.descricao = 'Ajuste posterior'
        oso.save()
        oso.refresh_from_db()

        self.assertTrue(oso.gera_cobranca)


class PermissaoDaRegraDeCobrancaOperacionalTestCase(APITestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.cliente = Cliente.objects.create(nome='Cliente exceção')
        self.catalogo = CatalogoOperacional.objects.create(nome='Revisão')
        self.url = reverse('catalogos-operacionais-detail', args=[self.catalogo.pk])

    def test_diretoria_configura_cobranca_e_excecoes(self):
        self.client.force_authenticate(user=self.diretor)

        response = self.client.patch(self.url, {
            'gera_cobranca': True,
            'clientes_isentos_cobranca': [self.cliente.pk],
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.catalogo.refresh_from_db()
        self.assertTrue(self.catalogo.gera_cobranca)
        self.assertEqual(list(self.catalogo.clientes_isentos_cobranca.all()), [self.cliente])

    def test_tecnico_nao_configura_regra_de_cobranca(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.patch(self.url, {'gera_cobranca': True})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.catalogo.refresh_from_db()
        self.assertFalse(self.catalogo.gera_cobranca)

    def test_tecnico_continua_podendo_editar_dados_nao_financeiros(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.patch(self.url, {'descricao': 'Descrição operacional'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.catalogo.refresh_from_db()
        self.assertEqual(self.catalogo.descricao, 'Descrição operacional')


class PermissaoDeGerenciarCatalogoOperacionalTestCase(APITestCase):
    """`catalogo_operacional.gerenciar` (19/10/2026) separa o cadastro do catálogo operacional da OS operacional."""

    def setUp(self):
        self.organizacao = Organizacao.objects.get(nome='Ergogroup')
        self.catalogo = CatalogoOperacional.objects.create(nome='Revisão')
        self.url = reverse('catalogos-operacionais-detail', args=[self.catalogo.pk])

    def pessoa_com(self, *permissoes):
        funcao = Funcao.objects.create(organizacao=self.organizacao, nome=f'Função {Funcao.objects.count()}')
        funcao.setores.add(setor_padrao())
        funcao.definir_permissoes(list(permissoes))
        pessoa = criar_usuario(None)
        pessoa.vinculos_setor.create(setor=setor_padrao(), funcao=funcao)
        return pessoa

    def test_so_os_operacional_nao_altera_o_catalogo(self):
        self.client.force_authenticate(user=self.pessoa_com(Permissao.OS_OPERACIONAL_GERENCIAR))

        criacao = self.client.post(reverse('catalogos-operacionais-list'), {'nome': 'Nova'})
        edicao = self.client.patch(self.url, {'descricao': 'Outra'})
        exclusao = self.client.delete(self.url)

        self.assertEqual(
            [criacao.status_code, edicao.status_code, exclusao.status_code], [status.HTTP_403_FORBIDDEN] * 3,
        )

    def test_gerenciar_catalogo_operacional_cria_edita_e_exclui(self):
        self.client.force_authenticate(user=self.pessoa_com(Permissao.CATALOGO_OPERACIONAL_GERENCIAR))

        criacao = self.client.post(reverse('catalogos-operacionais-list'), {'nome': 'Nova'})
        edicao = self.client.patch(self.url, {'descricao': 'Outra'})
        exclusao = self.client.delete(self.url)

        self.assertEqual(criacao.status_code, status.HTTP_201_CREATED)
        self.assertEqual(edicao.status_code, status.HTTP_200_OK)
        self.assertEqual(exclusao.status_code, status.HTTP_204_NO_CONTENT)

    def test_gerenciar_catalogo_operacional_nao_configura_cobranca(self):
        self.client.force_authenticate(user=self.pessoa_com(Permissao.CATALOGO_OPERACIONAL_GERENCIAR))

        response = self.client.patch(self.url, {'gera_cobranca': True})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_quem_gerenciava_a_os_operacional_recebeu_a_permissao_nova(self):
        # Migração organizacoes/0025: nenhuma função perde o acesso ao catálogo que já tinha.
        funcoes = FuncaoPermissao.objects.filter(permissao=Permissao.OS_OPERACIONAL_GERENCIAR).values_list('funcao', flat=True)

        self.assertTrue(funcoes)
        for funcao in Funcao.objects.filter(pk__in=funcoes):
            self.assertIn(Permissao.CATALOGO_OPERACIONAL_GERENCIAR, funcao.codigos_permissao)
