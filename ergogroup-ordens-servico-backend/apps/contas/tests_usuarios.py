from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.models import Usuario
from apps.organizacoes.apoio_testes import SETOR_E_FUNCAO, Perfil, criar_usuario
from apps.organizacoes.models import Funcao, Setor


def vinculo(perfil):
    nome_setor, nome_funcao = SETOR_E_FUNCAO[perfil]
    return {'setor': Setor.objects.get(nome=nome_setor).id, 'funcao': Funcao.objects.get(nome=nome_funcao).id}


class CadastroComVinculosTestCase(APITestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.client.force_authenticate(user=self.diretor)

    def payload(self, **extra):
        return {
            'email': 'novo@ergogroup.test', 'username': 'novo', 'nome_completo': 'Novo Usuário',
            'password': 'Senha-forte-123', 'password_confirmacao': 'Senha-forte-123', **extra,
        }

    def test_cria_usuario_com_setor_e_funcao(self):
        response = self.client.post(
            reverse('usuarios-list'), self.payload(vinculos=[vinculo(Perfil.FINANCEIRO)]), format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['vinculos'][0]['funcao_nome'], 'Financeiro')
        self.assertIn('financeiro.registrar_cobranca', response.data['permissoes']['globais'])
        self.assertTrue(response.data['ativo'])

    def test_cria_usuario_sem_vinculo(self):
        response = self.client.post(reverse('usuarios-list'), self.payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['vinculos'], [])
        self.assertEqual(response.data['permissoes']['globais'], [])

    def test_dois_vinculos_no_mesmo_setor_sao_rejeitados_e_nada_e_criado(self):
        response = self.client.post(
            reverse('usuarios-list'),
            self.payload(vinculos=[vinculo(Perfil.TECNICO), vinculo(Perfil.GESTOR_TECNICO)]), format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vinculos', response.data)
        self.assertFalse(Usuario.objects.filter(email='novo@ergogroup.test').exists())

    def test_gestor_nao_cria_usuario_com_funcao_que_nao_pode_conceder(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.GESTOR_ADMINISTRATIVO))

        response = self.client.post(
            reverse('usuarios-list'), self.payload(vinculos=[vinculo(Perfil.FINANCEIRO)]), format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(email='novo@ergogroup.test').exists())

    def test_editar_vinculo_troca_setor_e_funcao(self):
        tecnico = criar_usuario(Perfil.TECNICO)

        response = self.client.patch(
            reverse('usuarios-detail', args=[tecnico.id]), {'vinculos': [vinculo(Perfil.COMERCIAL)]}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            list(tecnico.vinculos_setor.values_list('setor__nome', 'funcao__nome')), [('Comercial', 'Comercial')],
        )

    def test_usuario_nao_recebe_dois_setores(self):
        tecnico = criar_usuario(Perfil.TECNICO)

        response = self.client.patch(
            reverse('usuarios-detail', args=[tecnico.id]),
            {'vinculos': [vinculo(Perfil.SUB_GESTOR_TECNICO), vinculo(Perfil.COMERCIAL)]}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vinculos', response.data)
        self.assertEqual(list(tecnico.vinculos_setor.values_list('funcao__nome', flat=True)), ['Técnico'])

    def test_editar_sem_enviar_vinculos_preserva_os_atuais(self):
        tecnico = criar_usuario(Perfil.TECNICO)

        self.client.patch(reverse('usuarios-detail', args=[tecnico.id]), {'nome_completo': 'Outro'}, format='json')

        self.assertEqual(tecnico.vinculos_setor.count(), 1)


class ListagemDeUsuariosTestCase(APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=criar_usuario(Perfil.DIRETOR))
        self.financeiro = criar_usuario(Perfil.FINANCEIRO)
        self.tecnico = criar_usuario(Perfil.TECNICO)

    def ids(self, response):
        itens = response.data['results'] if isinstance(response.data, dict) else response.data
        return {item['id'] for item in itens}

    def test_filtra_por_setor(self):
        setor = Setor.objects.get(nome='Financeiro')

        response = self.client.get(reverse('usuarios-list'), {'setor': setor.id})

        self.assertEqual(self.ids(response), {self.financeiro.id})

    def test_listagem_traz_os_vinculos(self):
        response = self.client.get(reverse('usuarios-list'))

        itens = response.data['results'] if isinstance(response.data, dict) else response.data
        linha = next(item for item in itens if item['id'] == self.tecnico.id)
        self.assertEqual(linha['vinculos'][0]['setor_nome'], 'Segurança do Trabalho')

    def test_endpoint_de_tipos_nao_existe_mais(self):
        response = self.client.get('/api/contas/usuarios/tipos/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StatusAtivoTestCase(APITestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)

    def test_desativar_bloqueia_o_login(self):
        self.client.force_authenticate(user=self.diretor)
        self.client.patch(reverse('usuarios-desativar', args=[self.tecnico.id]))
        self.client.force_authenticate(user=None)

        response = self.client.post(reverse('contas-login'), {
            'email': self.tecnico.email, 'password': 'senha-teste-123',
        })

        self.tecnico.refresh_from_db()
        self.assertFalse(self.tecnico.is_active)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_gestor_nao_reativa_diretor_desativado(self):
        diretor_inativo = criar_usuario(Perfil.DIRETOR, is_active=False)
        self.client.force_authenticate(user=criar_usuario(Perfil.GESTOR_TECNICO))

        response = self.client.patch(reverse('usuarios-ativar', args=[diretor_inativo.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        diretor_inativo.refresh_from_db()
        self.assertFalse(diretor_inativo.is_active)


class PermissoesNoLoginEMeTestCase(APITestCase):
    def setUp(self):
        self.gestor_tecnico = criar_usuario(Perfil.GESTOR_TECNICO)

    def test_login_devolve_vinculos_e_permissoes(self):
        response = self.client.post(reverse('contas-login'), {
            'email': self.gestor_tecnico.email, 'password': 'senha-teste-123',
        })

        usuario = response.data['usuario']
        self.assertNotIn('tipo_usuario', usuario)
        self.assertEqual(usuario['vinculos'][0]['funcao_nome'], 'Gestor Técnico')
        self.assertIn('os.ver_todas', usuario['permissoes']['globais'])
        por_setor = usuario['permissoes']['por_setor'][0]
        self.assertEqual(por_setor['setor_nome'], 'Segurança do Trabalho')
        self.assertIn('tarefas.distribuir', por_setor['permissoes'])

    def test_me_devolve_permissoes(self):
        self.client.force_authenticate(user=self.gestor_tecnico)

        response = self.client.get(reverse('contas-me'))

        self.assertFalse(response.data['permissoes']['todos_os_setores'])
        self.assertIn('usuarios.gerenciar', response.data['permissoes']['globais'])
