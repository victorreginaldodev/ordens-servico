from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.organizacoes.apoio_testes import Perfil, criar_usuario
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.organizacoes.models import Funcao, MembroSetor, Organizacao, Setor
from apps.organizacoes.permissoes import Permissao, perfil_de_acesso, tem_permissao

P = Permissao


class PermissoesPorSetorBase(APITestCase):
    """Ana gerencia a execução em Ergonomia e tem uma tarefa num serviço de Medicina, setor do qual não faz parte."""

    def setUp(self):
        self.ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.ergonomia = Setor.objects.create(organizacao=self.ergogroup, nome='Ergonomia')
        self.medicina = Setor.objects.create(organizacao=self.ergogroup, nome='Medicina')

        self.gestor_execucao = self.funcao('Gestor de Execução', [
            P.SERVICOS_VER_SETOR, P.SERVICOS_GERENCIAR, P.TAREFAS_DISTRIBUIR, P.TAREFAS_EDITAR_SETOR,
        ])
        self.tecnico = self.funcao('Executor', [])

        self.ana = criar_usuario(None)
        self.vincular(self.ana, self.ergonomia, self.gestor_execucao)
        self.colega = criar_usuario(None)

        ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente Setores'), data_venda=timezone.localdate(), valor=0,
        )
        # O setor do serviço vem do catálogo.
        aet = Catalogo.objects.create(nome='AET', setor=self.ergonomia)
        pcmso = Catalogo.objects.create(nome='PCMSO', setor=self.medicina)
        self.servico_ergonomia = Servico.objects.create(ordem_servico=ordem, descricao='AET', catalogo=aet)
        self.servico_medicina = Servico.objects.create(ordem_servico=ordem, descricao='PCMSO', catalogo=pcmso)
        self.servico_medicina_meu = Servico.objects.create(ordem_servico=ordem, descricao='Exames', catalogo=pcmso)
        self.servico_sem_setor = Servico.objects.create(ordem_servico=ordem, descricao='Legado')
        self.tarefa_medicina_do_colega = Tarefa.objects.create(servico=self.servico_medicina, responsavel=self.colega)
        self.tarefa_medicina_minha = Tarefa.objects.create(servico=self.servico_medicina_meu, responsavel=self.ana)
        self.tarefa_ergonomia_do_colega = Tarefa.objects.create(
            servico=self.servico_ergonomia, responsavel=self.colega,
        )

    def funcao(self, nome, permissoes):
        funcao = Funcao.objects.create(organizacao=self.ergogroup, nome=nome)
        funcao.setores.add(self.ergonomia, self.medicina)
        funcao.definir_permissoes(permissoes)
        return funcao

    def vincular(self, usuario, setor, funcao):
        MembroSetor.objects.create(usuario=usuario, setor=setor, funcao=funcao)
        usuario.__dict__.pop('_perfil_de_acesso', None)

    def ids(self, response):
        itens = response.data['results'] if isinstance(response.data, dict) else response.data
        return {item['id'] for item in itens}


class PerfilDeAcessoTestCase(PermissoesPorSetorBase):
    def test_permissao_por_setor_vale_so_no_setor_do_vinculo(self):
        self.assertTrue(tem_permissao(self.ana, P.TAREFAS_DISTRIBUIR, self.ergonomia))
        self.assertFalse(tem_permissao(self.ana, P.TAREFAS_DISTRIBUIR, self.medicina))

    def test_sem_setor_basta_ter_a_permissao_em_algum_setor(self):
        self.assertTrue(tem_permissao(self.ana, P.TAREFAS_DISTRIBUIR))

    def test_funcao_soma_permissoes_globais_e_do_setor(self):
        usuario = criar_usuario(None)
        self.vincular(usuario, self.ergonomia, self.funcao('Gestor e Vendas', [P.OS_VER_TODAS, P.TAREFAS_DISTRIBUIR]))

        self.assertTrue(tem_permissao(usuario, P.OS_VER_TODAS))
        self.assertTrue(tem_permissao(usuario, P.TAREFAS_DISTRIBUIR, self.ergonomia))
        self.assertFalse(tem_permissao(usuario, P.TAREFAS_DISTRIBUIR, self.medicina))

    def test_sem_vinculo_nao_tem_permissoes(self):
        self.assertFalse(tem_permissao(criar_usuario(None), P.AUDITORIA_VER))

    def test_setor_ou_funcao_inativos_nao_concedem_permissoes(self):
        self.ergonomia.ativo = False
        self.ergonomia.save()

        self.assertFalse(tem_permissao(self.ana, P.TAREFAS_DISTRIBUIR))
        self.assertEqual(perfil_de_acesso(self.ana).todas, frozenset())


class VisibilidadePorSetorTestCase(PermissoesPorSetorBase):
    def test_ve_servicos_do_setor_que_gerencia_e_os_proprios(self):
        self.client.force_authenticate(user=self.ana)

        response = self.client.get(reverse('servicos-list'))

        self.assertEqual(self.ids(response), {
            self.servico_ergonomia.id, self.servico_sem_setor.id, self.servico_medicina_meu.id,
        })

    def test_ve_tarefas_do_setor_que_gerencia_e_as_proprias(self):
        self.client.force_authenticate(user=self.ana)

        response = self.client.get(reverse('tarefas-list'))

        self.assertIn(self.tarefa_ergonomia_do_colega.id, self.ids(response))
        self.assertNotIn(self.tarefa_medicina_do_colega.id, self.ids(response))

    def test_funcao_com_ver_todas_libera_todas_as_os(self):
        comercial = criar_usuario(None)
        self.vincular(comercial, self.ergonomia, self.funcao('Vendas', [P.OS_VER_TODAS]))
        self.client.force_authenticate(user=comercial)

        response = self.client.get(reverse('servicos-list'))

        self.assertEqual(len(self.ids(response)), 4)


class AcoesPorSetorTestCase(PermissoesPorSetorBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.ana)

    def test_distribui_tarefa_so_no_setor_que_gerencia(self):
        executor = criar_usuario(None)
        self.vincular(executor, self.ergonomia, self.tecnico)
        no_setor = self.client.post(reverse('tarefas-list'), {
            'servico': self.servico_ergonomia.id, 'responsavel': executor.id,
        })
        fora_do_setor = self.client.post(reverse('tarefas-list'), {
            'servico': self.servico_medicina.id, 'responsavel': self.colega.id,
        })

        self.assertEqual(no_setor.status_code, status.HTTP_201_CREATED)
        self.assertEqual(fora_do_setor.status_code, status.HTTP_403_FORBIDDEN)

    def test_reatribui_tarefa_so_no_setor_que_gerencia(self):
        no_setor = self.client.patch(
            reverse('tarefas-detail', args=[self.tarefa_ergonomia_do_colega.id]), {'responsavel': self.ana.id},
        )
        fora_do_setor = self.client.patch(
            reverse('tarefas-detail', args=[self.tarefa_medicina_minha.id]), {'responsavel': self.colega.id},
        )

        self.assertEqual(no_setor.status_code, status.HTTP_200_OK)
        self.assertEqual(fora_do_setor.status_code, status.HTTP_403_FORBIDDEN)

    def test_nao_move_tarefa_para_servico_de_outro_setor(self):
        response = self.client.patch(
            reverse('tarefas-detail', args=[self.tarefa_ergonomia_do_colega.id]),
            {'servico': self.servico_medicina.id},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ajusta_servico_so_no_setor_que_gerencia(self):
        no_setor = self.client.patch(
            reverse('servicos-detail', args=[self.servico_ergonomia.id]), {'prioridade': 'alta'},
        )
        fora_do_setor = self.client.patch(
            reverse('servicos-detail', args=[self.servico_medicina_meu.id]), {'prioridade': 'alta'},
        )

        self.assertEqual(no_setor.status_code, status.HTTP_200_OK)
        self.assertEqual(fora_do_setor.status_code, status.HTTP_403_FORBIDDEN)


class NinguemConcedeOQueNaoTemTestCase(PermissoesPorSetorBase):
    def setUp(self):
        super().setUp()
        self.rh = criar_usuario(None)
        self.vincular(self.rh, self.ergonomia, self.funcao('RH', [
            P.USUARIOS_GERENCIAR, P.ORGANIZACAO_CONFIGURAR, P.TAREFAS_DISTRIBUIR,
        ]))
        self.client.force_authenticate(user=self.rh)

    def test_nao_cria_funcao_com_permissao_que_nao_tem(self):
        response = self.client.post(reverse('funcoes-list'), {
            'organizacao': self.ergogroup.id, 'setores': [self.ergonomia.id], 'nome': 'Super', 'permissoes': [P.FINANCEIRO_VER_VALORES],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('permissoes', response.data)

    def test_cria_funcao_com_permissoes_que_tem(self):
        response = self.client.post(reverse('funcoes-list'), {
            'organizacao': self.ergogroup.id, 'setores': [self.ergonomia.id], 'nome': 'Assistente de RH', 'permissoes': [P.USUARIOS_GERENCIAR],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_nao_altera_funcao_mais_poderosa_que_a_sua(self):
        diretoria = self.funcao('Diretoria', list(Permissao))

        response = self.client.patch(
            reverse('funcoes-detail', args=[diretoria.id]), {'permissoes': []}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(diretoria.codigos_permissao), len(Permissao))

    def test_nao_se_vincula_a_funcao_mais_poderosa(self):
        comercial = self.funcao('Vendas', [P.OS_VER_TODAS, P.FINANCEIRO_VER_VALORES])

        response = self.client.patch(
            reverse('membros-setor-detail', args=[self.rh.vinculos_setor.get().id]), {'funcao': comercial.id},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('funcao', response.data)

    def test_permissao_por_setor_so_e_concedida_no_setor_onde_a_tem(self):
        distribuidor = self.funcao('Distribuidor', [P.TAREFAS_DISTRIBUIR])

        em_medicina = self.client.post(reverse('membros-setor-list'), {
            'usuario': self.colega.id, 'setor': self.medicina.id, 'funcao': distribuidor.id,
        })
        em_ergonomia = self.client.post(reverse('membros-setor-list'), {
            'usuario': criar_usuario(None).id, 'setor': self.ergonomia.id, 'funcao': distribuidor.id,
        })

        self.assertEqual(em_medicina.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(em_ergonomia.status_code, status.HTTP_201_CREATED)

    def test_quem_tem_poder_de_diretoria_pelos_vinculos_fica_protegido(self):
        socio = criar_usuario(None)
        self.vincular(socio, self.medicina, self.funcao('Sócio', [P.USUARIOS_GERENCIAR_DIRETORIA]))

        response = self.client.patch(reverse('usuarios-desativar', args=[socio.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
