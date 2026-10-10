from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.contas.models import Usuario
from apps.organizacoes.apoio_testes import SETOR_E_FUNCAO, Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import Funcao, Setor
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.organizacoes.permissoes import Permissao, permissoes_do_usuario, tem_permissao


def vinculo(perfil):
    nome_setor, nome_funcao = SETOR_E_FUNCAO[perfil]
    return {'setor': Setor.objects.get(nome=nome_setor).id, 'funcao': Funcao.objects.get(nome=nome_funcao).id}


class CatalogoDePermissoesTestCase(APITestCase):
    def test_usuario_sem_vinculo_nao_tem_permissoes(self):
        self.assertEqual(permissoes_do_usuario(criar_usuario(None)), frozenset())

    def test_diretor_e_gestor_comercial_tem_todas(self):
        for tipo in (Perfil.DIRETOR, Perfil.GESTOR_COMERCIAL):
            self.assertEqual(permissoes_do_usuario(criar_usuario(tipo)), frozenset(Permissao))

    def test_superusuario_tem_todas(self):
        usuario = criar_usuario(Perfil.TECNICO, is_superuser=True)
        self.assertEqual(permissoes_do_usuario(usuario), frozenset(Permissao))

    def test_usuario_inativo_nao_tem_permissoes(self):
        usuario = criar_usuario(Perfil.DIRETOR, is_active=False)
        self.assertEqual(permissoes_do_usuario(usuario), frozenset())

    def test_tecnico_nao_ve_todas_as_os_nem_valores(self):
        tecnico = criar_usuario(Perfil.TECNICO)
        self.assertFalse(tem_permissao(tecnico, Permissao.OS_VER_TODAS))
        self.assertFalse(tem_permissao(tecnico, Permissao.FINANCEIRO_VER_VALORES))

    def test_administrativo_nao_ve_valores(self):
        for tipo in (Perfil.ADMINISTRATIVO, Perfil.GESTOR_ADMINISTRATIVO, Perfil.SUB_GESTOR_TECNICO):
            self.assertFalse(tem_permissao(criar_usuario(tipo), Permissao.FINANCEIRO_VER_VALORES))


class GestorComercialComoDiretorTestCase(APITestCase):
    def test_gestor_comercial_muda_status_de_tarefa_de_outra_pessoa(self):
        gestor_comercial = criar_usuario(Perfil.GESTOR_COMERCIAL)
        tecnico = criar_usuario(Perfil.TECNICO)
        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente'), data_venda=timezone.localdate(), valor=0,
        )
        tarefa = Tarefa.objects.create(
            servico=Servico.objects.create(ordem_servico=ordem, descricao='s'), responsavel=tecnico,
        )
        self.client.force_authenticate(user=gestor_comercial)

        response = self.client.patch(reverse('tarefas-detail', args=[tarefa.id]), {'status': 'em_andamento'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class EdicaoDoProprioCadastroTestCase(APITestCase):
    def setUp(self):
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.client.force_authenticate(user=self.tecnico)
        self.url = reverse('usuarios-detail', args=[self.tecnico.id])

    def test_tecnico_nao_consegue_se_vincular_a_diretoria(self):
        self.client.patch(self.url, {'vinculos': [vinculo(Perfil.DIRETOR)]}, format='json')

        self.assertEqual(
            list(self.tecnico.vinculos_setor.values_list('funcao__nome', flat=True)), ['Técnico'],
        )
        self.assertFalse(tem_permissao(Usuario.objects.get(pk=self.tecnico.pk), Permissao.OS_VER_TODAS))

    def test_tecnico_nao_altera_o_proprio_status(self):
        self.client.patch(self.url, {'ativo': False})

        self.tecnico.refresh_from_db()
        self.assertTrue(self.tecnico.is_active)

    def test_tecnico_edita_o_proprio_nome(self):
        response = self.client.patch(self.url, {'nome_completo': 'Nome Novo'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tecnico.refresh_from_db()
        self.assertEqual(self.tecnico.nome_completo, 'Nome Novo')


class GestaoDaDiretoriaTestCase(APITestCase):
    def setUp(self):
        self.gestor_tecnico = criar_usuario(Perfil.GESTOR_TECNICO)
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)

    def payload_novo_usuario(self, tipo):
        return {
            'email': f'novo.{tipo}@ergogroup.test', 'username': f'novo_{tipo}', 'nome_completo': 'Novo',
            'vinculos': [vinculo(tipo)], 'ativo': True,
            'password': 'Senha-forte-123', 'password_confirmacao': 'Senha-forte-123',
        }

    def test_gestor_nao_diretoria_cria_tecnico(self):
        self.client.force_authenticate(user=self.gestor_tecnico)

        response = self.client.post(reverse('usuarios-list'), self.payload_novo_usuario(Perfil.TECNICO), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_gestor_nao_diretoria_nao_cria_diretor(self):
        self.client.force_authenticate(user=self.gestor_tecnico)

        response = self.client.post(reverse('usuarios-list'), self.payload_novo_usuario(Perfil.DIRETOR), format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(email='novo.diretor@ergogroup.test').exists())

    def test_gestor_nao_diretoria_nao_promove_a_diretor(self):
        self.client.force_authenticate(user=self.gestor_tecnico)

        response = self.client.patch(
            reverse('usuarios-detail', args=[self.tecnico.id]),
            {'vinculos': [vinculo(Perfil.GESTOR_COMERCIAL)]}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            list(self.tecnico.vinculos_setor.values_list('funcao__nome', flat=True)), ['Técnico'],
        )

    def test_gestor_nao_diretoria_nao_desativa_nem_exclui_diretor(self):
        self.client.force_authenticate(user=self.gestor_tecnico)

        desativar = self.client.patch(reverse('usuarios-desativar', args=[self.diretor.id]))
        excluir = self.client.delete(reverse('usuarios-detail', args=[self.diretor.id]))

        self.assertEqual(desativar.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(excluir.status_code, status.HTTP_403_FORBIDDEN)
        self.diretor.refresh_from_db()
        self.assertTrue(self.diretor.is_active)

    def test_diretor_cria_diretor(self):
        self.client.force_authenticate(user=self.diretor)

        response = self.client.post(reverse('usuarios-list'), self.payload_novo_usuario(Perfil.DIRETOR), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class RegistroDeCobrancaTestCase(APITestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(nome='Cliente Cobranca')
        self.ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=timezone.localdate(), valor=100, liberar_em='venda',
        )
        self.url = reverse('ordens-servico-registrar-cobranca', args=[self.ordem.id])

    def test_financeiro_registra_cobranca(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.FINANCEIRO))

        response = self.client.patch(self.url, {'referencia_lancamento': 'NF 123'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ordem.refresh_from_db()
        self.assertTrue(self.ordem.cobranca_realizada)

    def test_comercial_nao_registra_cobranca(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.COMERCIAL))

        response = self.client.patch(self.url, {'referencia_lancamento': 'NF 123'})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ordem.refresh_from_db()
        self.assertFalse(self.ordem.cobranca_realizada)

    def test_edicao_generica_da_os_ignora_campos_de_cobranca(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.FINANCEIRO))

        self.client.patch(
            reverse('ordens-servico-detail', args=[self.ordem.id]),
            {'cobranca_realizada': True, 'referencia_lancamento': '999'},
        )

        self.ordem.refresh_from_db()
        self.assertFalse(self.ordem.cobranca_realizada)
        self.assertIsNone(self.ordem.referencia_lancamento)

    def test_tecnico_nao_registra_cobranca_de_os_operacional(self):
        from apps.catalogo.models import CatalogoOperacional
        from apps.ordens_servico.models import OrdemServicoOperacional
        tecnico = criar_usuario(Perfil.TECNICO)
        oso = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, responsavel=tecnico, revisao_cliente=True, status='finalizada',
            catalogo_operacional=CatalogoOperacional.objects.create(nome='Revisão'),
        )
        self.client.force_authenticate(user=tecnico)

        response = self.client.patch(
            reverse('ordens-servico-operacionais-registrar-cobranca', args=[oso.id]), {'numero_nf': '1'},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        oso.refresh_from_db()
        self.assertFalse(oso.cobranca_realizada)


class OcultacaoDeValoresTestCase(APITestCase):
    def setUp(self):
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Valores'), data_venda=timezone.localdate(),
            valor=1500, forma_pagamento='pix', quantidade_parcelas=3,
        )
        self.detalhe = reverse('ordens-servico-detail', args=[self.ordem.id])

    def test_administrativo_nao_recebe_valores_na_lista_nem_no_detalhe(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))

        lista = self.client.get(reverse('ordens-servico-list'))
        detalhe = self.client.get(self.detalhe)

        itens = lista.data['results'] if isinstance(lista.data, dict) else lista.data
        for campo in ('valor', 'forma_pagamento', 'quantidade_parcelas'):
            self.assertNotIn(campo, itens[0])
            self.assertNotIn(campo, detalhe.data)

    def test_financeiro_recebe_valores(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.FINANCEIRO))

        detalhe = self.client.get(self.detalhe)

        self.assertEqual(detalhe.data['valor'], '1500.00')

    def test_edicao_sem_permissao_nao_zera_o_valor(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))

        # O formulário do frontend reenvia valor e forma de pagamento mesmo sem exibi-los.
        response = self.client.patch(self.detalhe, {
            'valor': '0.00', 'forma_pagamento': '', 'quantidade_parcelas': '', 'observacao': 'ajuste',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ordem.refresh_from_db()
        self.assertEqual(self.ordem.valor, 1500)
        self.assertEqual(self.ordem.forma_pagamento, 'pix')
        self.assertEqual(self.ordem.observacao, 'ajuste')

    def test_criacao_sem_permissao_aceita_o_valor(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))

        response = self.client.post(reverse('ordens-servico-list'), {
            'cliente': self.ordem.cliente_id, 'data_venda': str(timezone.localdate()), 'valor': '800.00',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('valor', response.data)
        self.assertEqual(OrdemServico.objects.get(id=response.data['id']).valor, 800)


class VisibilidadeDeServicosTestCase(APITestCase):
    def setUp(self):
        self.tecnico = criar_usuario(Perfil.TECNICO)
        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Visibilidade'), data_venda=timezone.localdate(), valor=0,
        )
        self.meu = Servico.objects.create(ordem_servico=ordem, descricao='meu')
        self.outro = Servico.objects.create(ordem_servico=ordem, descricao='de outro')
        Tarefa.objects.create(servico=self.meu, responsavel=self.tecnico)
        Tarefa.objects.create(servico=self.meu, responsavel=self.tecnico)
        Tarefa.objects.create(servico=self.outro, responsavel=criar_usuario(Perfil.TECNICO))

    def ids(self, response):
        itens = response.data['results'] if isinstance(response.data, dict) else response.data
        return [s['id'] for s in itens]

    def test_tecnico_ve_so_servicos_em_que_tem_tarefa(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.get(reverse('servicos-list'))
        detalhe_de_outro = self.client.get(reverse('servicos-detail', args=[self.outro.id]))

        self.assertEqual(self.ids(response), [self.meu.id])
        self.assertEqual(detalhe_de_outro.status_code, status.HTTP_404_NOT_FOUND)

    def test_gestor_tecnico_ve_todos(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.GESTOR_TECNICO))

        response = self.client.get(reverse('servicos-list'))

        self.assertCountEqual(self.ids(response), [self.meu.id, self.outro.id])


class DistribuicaoDeTarefasTestCase(APITestCase):
    def setUp(self):
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.outro_tecnico = criar_usuario(Perfil.TECNICO)
        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Tarefas'), data_venda=timezone.localdate(), valor=0,
        )
        self.servico = Servico.objects.create(ordem_servico=ordem, descricao='servico')
        self.tarefa = Tarefa.objects.create(servico=self.servico, responsavel=self.tecnico)
        self.detalhe = reverse('tarefas-detail', args=[self.tarefa.id])

    def test_tecnico_nao_cria_tarefa(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.post(reverse('tarefas-list'), {
            'servico': self.servico.id, 'responsavel': self.tecnico.id,
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrativo_nao_cria_tarefa(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.ADMINISTRATIVO))

        response = self.client.post(reverse('tarefas-list'), {
            'servico': self.servico.id, 'responsavel': self.tecnico.id,
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_subgestor_tecnico_cria_e_reatribui_tarefa(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.SUB_GESTOR_TECNICO))

        criacao = self.client.post(reverse('tarefas-list'), {
            'servico': self.servico.id, 'responsavel': self.tecnico.id,
        })
        reatribuicao = self.client.patch(self.detalhe, {'responsavel': self.outro_tecnico.id})

        self.assertEqual(criacao.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reatribuicao.status_code, status.HTTP_200_OK)

    def test_responsavel_altera_o_status_da_propria_tarefa(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.patch(self.detalhe, {'status': 'em_andamento'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_responsavel_nao_reatribui_nem_edita_outros_campos(self):
        self.client.force_authenticate(user=self.tecnico)

        reatribuicao = self.client.patch(self.detalhe, {'responsavel': self.outro_tecnico.id})
        prazo = self.client.patch(self.detalhe, {'prazo': '2030-01-01'})

        self.assertEqual(reatribuicao.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(prazo.status_code, status.HTTP_403_FORBIDDEN)
        self.tarefa.refresh_from_db()
        self.assertEqual(self.tarefa.responsavel, self.tecnico)

    def test_responsavel_nao_exclui_a_propria_tarefa(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.delete(self.detalhe)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Tarefa.objects.filter(id=self.tarefa.id).exists())


class EscritaPorPermissaoTestCase(APITestCase):
    def setUp(self):
        from apps.catalogo.models import Catalogo
        self.cliente = Cliente.objects.create(nome='Cliente Escrita')
        self.catalogo = Catalogo.objects.create(setor=setor_padrao(), nome='PGR')
        self.ordem = OrdemServico.objects.create(cliente=self.cliente, data_venda=timezone.localdate(), valor=0)
        self.servico = Servico.objects.create(ordem_servico=self.ordem, descricao='servico')

    def como(self, tipo):
        self.client.force_authenticate(user=criar_usuario(tipo))

    def test_tecnico_nao_cria_os(self):
        self.como(Perfil.TECNICO)
        response = self.client.post(reverse('ordens-servico-list'), {
            'cliente': self.cliente.id, 'data_venda': str(timezone.localdate()),
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_somente_diretoria_exclui_os(self):
        self.como(Perfil.COMERCIAL)
        negado = self.client.delete(reverse('ordens-servico-detail', args=[self.ordem.id]))
        self.como(Perfil.DIRETOR)
        permitido = self.client.delete(reverse('ordens-servico-detail', args=[self.ordem.id]))

        self.assertEqual(negado.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(permitido.status_code, status.HTTP_204_NO_CONTENT)

    def test_subgestor_tecnico_exclui_servico(self):
        self.como(Perfil.SUB_GESTOR_TECNICO)
        response = self.client.delete(reverse('servicos-detail', args=[self.servico.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_financeiro_nao_altera_catalogo(self):
        self.como(Perfil.FINANCEIRO)
        response = self.client.patch(reverse('catalogos-detail', args=[self.catalogo.id]), {'nome': 'Outro'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_comercial_altera_catalogo(self):
        self.como(Perfil.COMERCIAL)
        response = self.client.patch(reverse('catalogos-detail', args=[self.catalogo.id]), {'nome': 'Outro'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_tecnico_continua_cadastrando_clientes(self):
        self.como(Perfil.TECNICO)
        response = self.client.post(reverse('clientes-list'), {'nome': 'Cliente Novo'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_administrativo_nao_gerencia_catalogo_operacional(self):
        self.como(Perfil.ADMINISTRATIVO)
        response = self.client.post(reverse('catalogos-operacionais-list'), {'nome': 'Revisão'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tecnico_continua_vendo_a_auditoria(self):
        self.como(Perfil.TECNICO)
        response = self.client.get(reverse('auditoria-registros-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
