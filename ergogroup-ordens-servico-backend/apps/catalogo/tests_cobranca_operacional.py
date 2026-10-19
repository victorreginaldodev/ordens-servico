from unittest import mock

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import CatalogoOperacional
from apps.clientes.models import Cliente
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import Funcao, FuncaoPermissao, Organizacao
from apps.organizacoes.permissoes import Permissao
from apps.ordens_servico.models import OrdemServicoOperacional
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional as S


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

    def test_oso_nao_faturada_segue_a_regra_atual_ao_salvar(self):
        # Revisão de 19/10/2026 do ADR 0011: a regra do catálogo vale até a OSO ser faturada.
        oso = self.criar_oso(self.cliente)
        self.catalogo.gera_cobranca = False
        self.catalogo.save(update_fields=['gera_cobranca'])

        oso.descricao = 'Ajuste posterior'
        oso.save()
        oso.refresh_from_db()

        self.assertFalse(oso.gera_cobranca)

    def test_oso_faturada_nao_muda(self):
        oso = self.criar_oso(self.cliente)
        OrdemServicoOperacional.objects.filter(pk=oso.pk).update(cobranca_realizada=True)
        oso.refresh_from_db()
        self.catalogo.gera_cobranca = False
        self.catalogo.save(update_fields=['gera_cobranca'])

        oso.descricao = 'Ajuste posterior'
        oso.save()
        oso.refresh_from_db()

        self.assertTrue(oso.gera_cobranca)

    def test_revisao_do_cliente_nao_decide_a_cobranca(self):
        self.catalogo.gera_cobranca = False
        self.catalogo.save(update_fields=['gera_cobranca'])

        oso = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.catalogo, responsavel=self.tecnico,
            revisao_cliente=True, status=S.FINALIZADA,
        )

        self.assertFalse(oso.gera_cobranca)
        self.assertIsNone(oso.data_liberacao_cobranca)


class RegraDoCatalogoNasOsosExistentesTestCase(APITestCase):
    """Mudar a regra no catálogo recalcula as OS operacionais ainda não faturadas (ADR 0011, 19/10/2026)."""

    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.cliente = Cliente.objects.create(nome='Cliente padrão')
        self.outro = Cliente.objects.create(nome='Outro cliente')
        self.catalogo = CatalogoOperacional.objects.create(nome='Revisão')
        self.url = reverse('catalogos-operacionais-detail', args=[self.catalogo.pk])
        self.finalizada = self.oso(status=S.FINALIZADA)
        self.em_aberto = self.oso(status=S.EM_ANDAMENTO)
        self.do_outro = self.oso(status=S.FINALIZADA, cliente=self.outro)
        self.faturada = self.oso(status=S.FINALIZADA)
        OrdemServicoOperacional.objects.filter(pk=self.faturada.pk).update(cobranca_realizada=True)
        self.client.force_authenticate(user=self.diretor)

    def oso(self, **campos):
        dados = {'cliente': self.cliente, 'catalogo_operacional': self.catalogo, 'responsavel': self.tecnico, **campos}
        return OrdemServicoOperacional.objects.create(**dados)

    def estado(self, oso):
        oso.refresh_from_db()
        return oso.gera_cobranca, oso.data_liberacao_cobranca is not None

    def test_passar_a_cobrar_libera_as_finalizadas_sem_mandar_email(self):
        with mock.patch('apps.ordens_servico.signals.notificar_liberacao_cobranca') as email:
            response = self.client.patch(self.url, {'gera_cobranca': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(self.estado(self.finalizada), (True, True))
        self.assertEqual(self.estado(self.em_aberto), (True, False))
        self.assertEqual(self.estado(self.do_outro), (True, True))
        self.finalizada.refresh_from_db()
        self.assertEqual(self.finalizada.liberada_cobranca_por, self.tecnico)
        self.assertEqual(self.estado(self.faturada), (False, False))
        email.assert_not_called()

    def test_cliente_isento_sai_da_fila(self):
        self.client.patch(self.url, {'gera_cobranca': True}, format='json')

        self.client.patch(self.url, {'clientes_isentos_cobranca': [self.outro.pk]}, format='json')

        self.assertEqual(self.estado(self.do_outro), (False, False))
        self.assertEqual(self.estado(self.finalizada), (True, True))

    def test_deixar_de_cobrar_tira_as_nao_faturadas(self):
        self.client.patch(self.url, {'gera_cobranca': True}, format='json')
        OrdemServicoOperacional.objects.filter(pk=self.faturada.pk).update(gera_cobranca=True)

        self.client.patch(self.url, {'gera_cobranca': False}, format='json')

        self.assertEqual(self.estado(self.finalizada), (False, False))
        self.assertEqual(self.estado(self.em_aberto), (False, False))
        self.faturada.refresh_from_db()
        self.assertTrue(self.faturada.gera_cobranca)

    def test_mudar_so_a_descricao_nao_recalcula(self):
        with mock.patch.object(CatalogoOperacional, 'reaplicar_regra_de_cobranca') as reaplicar:
            self.client.patch(self.url, {'descricao': 'Outra'}, format='json')

        reaplicar.assert_not_called()


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
