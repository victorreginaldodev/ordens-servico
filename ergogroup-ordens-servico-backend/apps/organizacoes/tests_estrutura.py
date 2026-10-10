from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.organizacoes.apoio_testes import Perfil, criar_usuario
from apps.organizacoes.models import Funcao, MembroSetor, Organizacao, Setor
from apps.organizacoes.permissoes import Permissao


class EstruturaBaseTestCase(APITestCase):
    def setUp(self):
        self.ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.novato = criar_usuario(None)
        self.ergonomia = Setor.objects.create(organizacao=self.ergogroup, nome='Ergonomia')
        self.gestor_execucao = Funcao.objects.create(organizacao=self.ergogroup, nome='Gestor de Execução')
        self.gestor_execucao.setores.add(self.ergonomia)
        self.gestor_execucao.definir_permissoes([Permissao.TAREFAS_DISTRIBUIR, Permissao.SERVICOS_VER_SETOR])


class FuncaoApiTestCase(EstruturaBaseTestCase):
    def test_diretor_cria_funcao_com_permissoes(self):
        self.client.force_authenticate(user=self.diretor)

        response = self.client.post(reverse('funcoes-list'), {
            'organizacao': self.ergogroup.id, 'setores': [self.ergonomia.id], 'nome': 'Financeiro Sênior',
            'permissoes': [Permissao.FINANCEIRO_VER_VALORES, Permissao.FINANCEIRO_REGISTRAR_COBRANCA],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data['permissoes'], ['financeiro.registrar_cobranca', 'financeiro.ver_valores'],
        )
        self.assertEqual(Funcao.objects.get(nome='Financeiro Sênior').permissoes.count(), 2)

    def test_permissao_inexistente_e_rejeitada(self):
        self.client.force_authenticate(user=self.diretor)

        response = self.client.post(reverse('funcoes-list'), {
            'organizacao': self.ergogroup.id, 'setores': [self.ergonomia.id], 'nome': 'Inventada', 'permissoes': ['aprovar.orcamento'],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('permissoes', response.data)

    def test_atualizar_permissoes_substitui_a_lista(self):
        self.client.force_authenticate(user=self.diretor)

        response = self.client.patch(
            reverse('funcoes-detail', args=[self.gestor_execucao.id]),
            {'permissoes': [Permissao.TAREFAS_EDITAR_SETOR]}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.gestor_execucao.codigos_permissao, ['tarefas.editar_setor'])

    def test_editar_so_o_nome_preserva_permissoes(self):
        self.client.force_authenticate(user=self.diretor)

        self.client.patch(
            reverse('funcoes-detail', args=[self.gestor_execucao.id]), {'nome': 'Coordenador'}, format='json',
        )

        self.assertEqual(len(self.gestor_execucao.codigos_permissao), 2)

    def test_tecnico_le_mas_nao_cria_funcao(self):
        self.client.force_authenticate(user=self.tecnico)

        leitura = self.client.get(reverse('funcoes-list'))
        criacao = self.client.post(reverse('funcoes-list'), {
            'organizacao': self.ergogroup.id, 'nome': 'Qualquer',
        }, format='json')

        self.assertEqual(leitura.status_code, status.HTTP_200_OK)
        self.assertEqual(criacao.status_code, status.HTTP_403_FORBIDDEN)

    def test_catalogo_de_permissoes_informa_o_escopo(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.get(reverse('funcoes-permissoes-disponiveis'))

        escopos = {item['codigo']: item['escopo'] for item in response.data}
        self.assertEqual(len(escopos), len(Permissao))
        self.assertEqual(escopos['tarefas.distribuir'], 'setor')
        self.assertEqual(escopos['financeiro.ver_valores'], 'global')

    def test_excluir_funcao_em_uso_retorna_409(self):
        MembroSetor.objects.create(usuario=self.novato, setor=self.ergonomia, funcao=self.gestor_execucao)
        self.client.force_authenticate(user=self.diretor)

        response = self.client.delete(reverse('funcoes-detail', args=[self.gestor_execucao.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('Desative a função', response.data['detail'])


class MembroSetorApiTestCase(EstruturaBaseTestCase):
    def payload(self, **extra):
        return {'usuario': self.novato.id, 'setor': self.ergonomia.id, 'funcao': self.gestor_execucao.id, **extra}

    def test_gestor_vincula_usuario_a_setor(self):
        self.client.force_authenticate(user=self.diretor)

        response = self.client.post(reverse('membros-setor-list'), self.payload())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['setor_nome'], 'Ergonomia')
        self.assertEqual(response.data['funcao_nome'], 'Gestor de Execução')

    def test_usuario_pertence_a_um_unico_setor(self):
        medicina = Setor.objects.create(organizacao=self.ergogroup, nome='Medicina')
        self.gestor_execucao.setores.add(medicina)
        MembroSetor.objects.create(usuario=self.novato, setor=self.ergonomia, funcao=self.gestor_execucao)
        self.client.force_authenticate(user=self.diretor)

        mesmo_setor = self.client.post(reverse('membros-setor-list'), self.payload())
        outro_setor = self.client.post(reverse('membros-setor-list'), self.payload(setor=medicina.id))

        self.assertEqual(mesmo_setor.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(outro_setor.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('usuario', outro_setor.data)
        self.assertEqual(self.novato.vinculos_setor.count(), 1)

    def test_mudar_de_setor_edita_o_vinculo(self):
        medicina = Setor.objects.create(organizacao=self.ergogroup, nome='Medicina')
        self.gestor_execucao.setores.add(medicina)
        vinculo = MembroSetor.objects.create(usuario=self.novato, setor=self.ergonomia, funcao=self.gestor_execucao)
        self.client.force_authenticate(user=self.diretor)

        response = self.client.patch(
            reverse('membros-setor-detail', args=[vinculo.id]), {'setor': medicina.id}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(list(self.novato.vinculos_setor.values_list('setor__nome', flat=True)), ['Medicina'])

    def test_banco_recusa_segundo_vinculo(self):
        medicina = Setor.objects.create(organizacao=self.ergogroup, nome='Medicina')
        MembroSetor.objects.create(usuario=self.novato, setor=self.ergonomia, funcao=self.gestor_execucao)

        with self.assertRaises(IntegrityError), transaction.atomic():
            MembroSetor.objects.create(usuario=self.novato, setor=medicina, funcao=self.gestor_execucao)

    def test_funcao_de_outra_organizacao_e_rejeitada(self):
        outra = Organizacao.objects.create(nome='Outra Empresa')
        funcao_de_fora = Funcao.objects.create(organizacao=outra, nome='Gestor')
        self.client.force_authenticate(user=self.diretor)

        response = self.client.post(reverse('membros-setor-list'), self.payload(funcao=funcao_de_fora.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('funcao', response.data)

    def test_tecnico_nao_cria_vinculos(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.post(reverse('membros-setor-list'), self.payload())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_excluir_setor_com_membros_retorna_409(self):
        MembroSetor.objects.create(usuario=self.novato, setor=self.ergonomia, funcao=self.gestor_execucao)
        self.client.force_authenticate(user=self.diretor)

        response = self.client.delete(reverse('setores-detail', args=[self.ergonomia.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('membro de setor', response.data['detail'])

    def test_mesmo_nome_de_setor_em_outra_organizacao(self):
        outra = Organizacao.objects.create(nome='Outra Empresa')

        Setor.objects.create(organizacao=outra, nome='Ergonomia')

        self.assertEqual(Setor.objects.filter(nome='Ergonomia').count(), 2)

