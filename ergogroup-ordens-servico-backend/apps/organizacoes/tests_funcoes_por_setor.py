from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.organizacoes.apoio_testes import Perfil, criar_usuario
from apps.organizacoes.models import Funcao, MembroSetor, Organizacao, Setor


class FuncoesLiberadasPorSetorTestCase(APITestCase):
    def setUp(self):
        self.ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.comercial = Setor.objects.get(nome='Comercial')
        self.seguranca = Setor.objects.get(nome='Segurança do Trabalho')
        self.funcao_tecnico = Funcao.objects.get(nome='Técnico')
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.pessoa = criar_usuario(None)
        self.client.force_authenticate(user=self.diretor)

    def test_funcoes_iniciais_liberadas_no_setor_da_sua_area(self):
        esperado = {
            'Diretor': {'Diretoria'},
            'Gestor Comercial': {'Comercial'}, 'Comercial': {'Comercial'},
            'Gestor Técnico': {'Segurança do Trabalho'}, 'Sub-Gestor Técnico': {'Segurança do Trabalho'},
            'Técnico': {'Segurança do Trabalho'},
            'Gestor Financeiro': {'Financeiro'}, 'Financeiro': {'Financeiro'},
            'Gestor Administrativo': {'Administrativo'}, 'Administrativo': {'Administrativo'},
        }
        for nome, setores in esperado.items():
            funcao = Funcao.objects.get(nome=nome)
            self.assertEqual(set(funcao.setores.values_list('nome', flat=True)), setores, nome)

    def test_api_de_vinculos_recusa_tecnico_no_comercial(self):
        response = self.client.post(reverse('membros-setor-list'), {
            'usuario': self.pessoa.id, 'setor': self.comercial.id, 'funcao': self.funcao_tecnico.id,
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('não pode ser usada no setor "Comercial"', str(response.data['funcao']))

    def test_api_de_vinculos_aceita_tecnico_em_seguranca_do_trabalho(self):
        response = self.client.post(reverse('membros-setor-list'), {
            'usuario': self.pessoa.id, 'setor': self.seguranca.id, 'funcao': self.funcao_tecnico.id,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cadastro_de_usuario_recusa_tecnico_no_comercial(self):
        response = self.client.post(reverse('usuarios-list'), {
            'email': 'novo@ergogroup.test', 'username': 'novo', 'nome_completo': 'Novo',
            'password': 'Senha-forte-123', 'password_confirmacao': 'Senha-forte-123',
            'vinculos': [{'setor': self.comercial.id, 'funcao': self.funcao_tecnico.id}],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vinculos', response.data)

    def test_trocar_a_funcao_de_um_vinculo_tambem_e_validado(self):
        vinculo = MembroSetor.objects.create(
            usuario=self.pessoa, setor=self.comercial, funcao=Funcao.objects.get(nome='Comercial'),
        )

        response = self.client.patch(
            reverse('membros-setor-detail', args=[vinculo.id]), {'funcao': self.funcao_tecnico.id},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validacao_vale_tambem_fora_da_api(self):
        # O admin do Django usa a mesma validação do modelo.
        with self.assertRaises(ValidationError):
            MembroSetor(usuario=self.pessoa, setor=self.comercial, funcao=self.funcao_tecnico).full_clean()


class SetoresDaFuncaoApiTestCase(APITestCase):
    def setUp(self):
        self.ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.comercial = Setor.objects.get(nome='Comercial')
        self.seguranca = Setor.objects.get(nome='Segurança do Trabalho')
        self.client.force_authenticate(user=criar_usuario(Perfil.DIRETOR))

    def criar(self, **extra):
        return self.client.post(reverse('funcoes-list'), {
            'organizacao': self.ergogroup.id, 'nome': 'Gestor de Área', **extra,
        }, format='json')

    def test_funcao_reaproveitada_em_varios_setores(self):
        response = self.criar(setores=[self.comercial.id, self.seguranca.id])

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            {s['nome'] for s in response.data['setores_detalhe']}, {'Comercial', 'Segurança do Trabalho'},
        )

    def test_setores_sao_obrigatorios(self):
        sem_campo = self.criar()
        vazio = self.criar(setores=[])

        self.assertEqual(sem_campo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(vazio.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('setores', vazio.data)

    def test_setor_de_outra_organizacao_e_recusado(self):
        de_fora = Setor.objects.create(organizacao=Organizacao.objects.create(nome='Outra'), nome='Vendas')

        response = self.criar(setores=[de_fora.id])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('setores', response.data)

    def test_nao_retira_setor_com_pessoas_vinculadas(self):
        tecnico = Funcao.objects.get(nome='Técnico')
        criar_usuario(Perfil.TECNICO)

        response = self.client.patch(
            reverse('funcoes-detail', args=[tecnico.id]), {'setores': [self.comercial.id]}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Segurança do Trabalho', str(response.data['setores']))
        self.assertTrue(tecnico.liberada_no_setor(self.seguranca))

    def test_retira_setor_sem_pessoas_vinculadas(self):
        funcao = self.criar(setores=[self.comercial.id, self.seguranca.id]).data

        response = self.client.patch(
            reverse('funcoes-detail', args=[funcao['id']]), {'setores': [self.comercial.id]}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['setores'], [self.comercial.id])

    def test_filtro_de_funcoes_por_setor(self):
        response = self.client.get(reverse('funcoes-list'), {'setor': self.seguranca.id})

        nomes = {f['nome'] for f in (response.data['results'] if isinstance(response.data, dict) else response.data)}
        self.assertEqual(nomes, {'Gestor Técnico', 'Sub-Gestor Técnico', 'Técnico'})
