"""Quem recebe tarefas (revisão de permissões e setores de 14/10/2026, P1 e P2; e P7 para o Gestor Técnico).

- P1: "também executa em" deixa a pessoa receber tarefas num setor que não é o da lotação, sem gestão lá;
- P2: a lotação só dá direito a receber se a função tem `tarefas.receber`; `setores.todos` não a estende.
"""
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import AtuacaoEmSetor, Funcao, MembroSetor, Organizacao, Setor
from apps.organizacoes.permissoes import Permissao, permissoes_do_usuario


class RecebeTarefasBase(APITestCase):
    def setUp(self):
        self.seguranca = setor_padrao()
        ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.ergonomia = Setor.objects.create(organizacao=ergogroup, nome='Ergonomia')
        self.diretor = criar_usuario(Perfil.DIRETOR, nome_completo='Diretora')
        self.gestor_comercial = criar_usuario(Perfil.GESTOR_COMERCIAL, nome_completo='Gestor Comercial')
        self.gestor_tecnico = criar_usuario(Perfil.GESTOR_TECNICO, nome_completo='Gestora Técnica')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Um')
        catalogo = Catalogo.objects.create(nome='PGR', setor=self.seguranca)
        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Recebe'), data_venda=timezone.localdate(), valor=0,
        )
        self.servico = Servico.objects.create(ordem_servico=ordem, descricao='PGR', catalogo=catalogo)

    def distribuir(self, por, responsavel):
        self.client.force_authenticate(user=por)
        return self.client.post(
            reverse('execucao-distribuir', args=[self.servico.id]), {'tarefas': [{'responsavel': responsavel.id}]},
            format='json',
        )

    def tambem_executa(self, por, usuario, setores):
        self.client.force_authenticate(user=por)
        return self.client.patch(
            reverse('usuarios-detail', args=[usuario.id]), {'tambem_executa_em': [s.id for s in setores]},
            format='json',
        )


class RegraDeQuemRecebeTestCase(RecebeTarefasBase):
    def test_tecnico_lotado_recebe(self):
        self.assertEqual(self.distribuir(self.gestor_tecnico, self.tecnico).status_code, status.HTTP_201_CREATED)

    def test_diretor_e_gestor_comercial_nao_recebem_sem_tambem_executar(self):
        for pessoa in (self.diretor, self.gestor_comercial):
            response = self.distribuir(self.diretor, pessoa)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('não recebe tarefas do setor', str(response.data['responsavel']))

    def test_diretor_e_gestor_comercial_recebem_quando_tambem_executam(self):
        for pessoa in (self.diretor, self.gestor_comercial):
            self.assertEqual(self.tambem_executa(self.diretor, pessoa, [self.seguranca]).status_code, status.HTTP_200_OK)

        self.assertEqual(self.distribuir(self.diretor, self.diretor).status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.distribuir(self.gestor_comercial, self.gestor_comercial).status_code, status.HTTP_201_CREATED)

    def test_lotado_sem_recebe_tarefas_nao_recebe(self):
        estagiario_funcao = Funcao.objects.create(organizacao=self.seguranca.organizacao, nome='Estagiário')
        estagiario_funcao.setores.add(self.seguranca)
        estagiario = criar_usuario(None)
        MembroSetor.objects.create(usuario=estagiario, setor=self.seguranca, funcao=estagiario_funcao)

        self.assertEqual(self.distribuir(self.gestor_tecnico, estagiario).status_code, status.HTTP_400_BAD_REQUEST)

    def test_tambem_executar_nao_da_gestao_no_setor(self):
        self.tambem_executa(self.diretor, self.tecnico, [self.ergonomia])
        tecnico = type(self.tecnico).objects.get(pk=self.tecnico.pk)

        self.assertFalse(Permissao.SERVICOS_VER_SETOR in permissoes_do_usuario(tecnico))
        self.assertTrue(self.ergonomia.recebe_tarefas(tecnico))

    def test_equipe_mostra_quem_tambem_executa_e_esconde_quem_nao_recebe(self):
        self.tambem_executa(self.diretor, self.gestor_comercial, [self.seguranca])
        self.client.force_authenticate(user=self.gestor_tecnico)

        equipe = {linha['nome']: linha for linha in self.client.get(
            reverse('execucao-equipe'), {'setor': self.seguranca.id},
        ).data}

        self.assertEqual(
            (equipe['Gestor Comercial']['recebe_tarefas'], equipe['Gestor Comercial']['membro_do_setor'],
             equipe['Gestor Comercial']['setor_de_origem_nome']),
            (True, False, 'Comercial'),
        )
        self.assertEqual((equipe['Técnico Um']['membro_do_setor'], equipe['Técnico Um']['setor_de_origem_nome']), (True, None))
        self.assertNotIn('Diretora', equipe)


class QuemMarcaTambemExecutaTestCase(RecebeTarefasBase):
    def test_quem_distribui_no_setor_marca_e_mostra_na_pessoa(self):
        # O Gestor Comercial é tratado como diretoria, e só a diretoria o edita; aqui, um colaborador do Comercial.
        comercial = criar_usuario(Perfil.COMERCIAL)
        response = self.tambem_executa(self.gestor_tecnico, comercial, [self.seguranca])

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tambem_executa_em'], [{'setor': self.seguranca.id, 'setor_nome': 'Segurança do Trabalho'}])

    def test_quem_nao_distribui_no_setor_nao_marca(self):
        response = self.tambem_executa(self.gestor_tecnico, self.tecnico, [self.ergonomia])

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(AtuacaoEmSetor.objects.exists())

    def test_quem_nao_gerencia_usuarios_nao_altera(self):
        self.tambem_executa(self.tecnico, self.tecnico, [self.ergonomia])

        self.assertFalse(AtuacaoEmSetor.objects.exists())

    def test_setor_da_lotacao_nao_entra(self):
        response = self.tambem_executa(self.diretor, self.tecnico, [self.seguranca])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lista_vazia_remove(self):
        self.tambem_executa(self.diretor, self.gestor_comercial, [self.seguranca])
        self.tambem_executa(self.diretor, self.gestor_comercial, [])

        self.assertFalse(AtuacaoEmSetor.objects.exists())

    def test_diretor_concede_funcao_que_recebe_tarefas(self):
        # Ninguém concede o que não tem; "Recebe tarefas" é exceção: basta distribuir no setor.
        self.client.force_authenticate(user=self.diretor)
        response = self.client.post(reverse('membros-setor-list'), {
            'usuario': criar_usuario(None).id, 'setor': self.seguranca.id,
            'funcao': Funcao.objects.get(nome='Técnico').id,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class GestorTecnicoSemVerValoresTestCase(RecebeTarefasBase):
    def test_por_padrao_nao_ve_valores(self):
        self.assertNotIn(Permissao.FINANCEIRO_VER_VALORES, permissoes_do_usuario(self.gestor_tecnico))

    def test_so_quem_ve_valores_pode_ativar_na_funcao(self):
        funcao = Funcao.objects.get(nome='Gestor Técnico')
        corpo = {'permissoes': [*funcao.codigos_permissao, Permissao.FINANCEIRO_VER_VALORES]}

        self.client.force_authenticate(user=self.gestor_tecnico)
        negado = self.client.patch(reverse('funcoes-detail', args=[funcao.id]), corpo, format='json')
        self.client.force_authenticate(user=self.diretor)
        aceito = self.client.patch(reverse('funcoes-detail', args=[funcao.id]), corpo, format='json')

        self.assertIn(negado.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN))
        self.assertEqual(aceito.status_code, status.HTTP_200_OK, aceito.data)
        self.assertIn(Permissao.FINANCEIRO_VER_VALORES, Funcao.objects.get(pk=funcao.pk).codigos_permissao)
