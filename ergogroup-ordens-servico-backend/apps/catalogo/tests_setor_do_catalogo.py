"""Setor do catálogo e papel do setor (revisão de permissões e setores de 14/10/2026, P5, P6 e P7)."""
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroAuditoria
from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import AtuacaoEmSetor, Funcao, Organizacao, Setor
from apps.organizacoes.permissoes import Permissao


class SetorDoCatalogoBase(APITestCase):
    def setUp(self):
        self.seguranca = setor_padrao()
        self.ergonomia = Setor.objects.create(organizacao=Organizacao.objects.get(nome='Ergogroup'), nome='Ergonomia')
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.client.force_authenticate(user=self.diretor)
        self.catalogo = Catalogo.objects.create(nome='ERGONOMIA - AET', setor=self.seguranca)
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente'), data_venda=timezone.localdate(), valor=0,
        )

    def servico(self, catalogo=None, recebido=False):
        servico = Servico.objects.create(ordem_servico=self.ordem, descricao='AET', catalogo=catalogo or self.catalogo)
        if recebido:
            servico.registrar_recebimento(self.diretor)
        return servico

    def ergonomia_recebe(self):
        AtuacaoEmSetor.objects.create(usuario=self.tecnico, setor=self.ergonomia)


class SetorSemQuemRecebaTestCase(SetorDoCatalogoBase):
    def test_nao_cria_catalogo_ativo_em_setor_sem_quem_receba(self):
        response = self.client.post(reverse('catalogos-list'), {'nome': 'AET', 'setor': self.ergonomia.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('não tem quem receba tarefas', str(response.data['setor']))

    def test_catalogo_inativo_pode_ficar_em_setor_sem_quem_receba(self):
        response = self.client.post(
            reverse('catalogos-list'), {'nome': 'AET', 'setor': self.ergonomia.id, 'ativo': False}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_nao_muda_para_setor_sem_quem_receba(self):
        response = self.client.patch(reverse('catalogos-detail', args=[self.catalogo.id]), {'setor': self.ergonomia.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nao_reativa_em_setor_sem_quem_receba(self):
        inativo = Catalogo.objects.create(nome='AET antigo', setor=self.ergonomia, ativo=False)

        response = self.client.patch(reverse('catalogos-detail', args=[inativo.id]), {'ativo': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_editar_o_nome_nao_reavalia_o_setor(self):
        legado = Catalogo.objects.create(nome='AET legado', setor=self.ergonomia)

        response = self.client.patch(reverse('catalogos-detail', args=[legado.id]), {'nome': 'AET'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class MudarSetorDoCatalogoTestCase(SetorDoCatalogoBase):
    def test_lista_traz_os_servicos_em_aberto_sem_tarefas(self):
        self.servico()
        self.servico(recebido=True)
        com_tarefa = self.servico()
        Tarefa.objects.create(servico=com_tarefa, responsavel=self.tecnico)

        response = self.client.get(reverse('catalogos-detail', args=[self.catalogo.id]))

        self.assertEqual(response.data['servicos_em_aberto'], 2)

    def test_mudar_sem_mover_deixa_os_servicos_no_setor_antigo(self):
        self.ergonomia_recebe()
        servico = self.servico()

        response = self.client.patch(reverse('catalogos-detail', args=[self.catalogo.id]), {'setor': self.ergonomia.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['servicos_movidos'], 0)
        servico.refresh_from_db()
        self.assertEqual(servico.setor, self.seguranca)

    def test_mudar_movendo_leva_os_servicos_sem_tarefas_e_zera_o_recebimento(self):
        self.ergonomia_recebe()
        recebido = self.servico(recebido=True)
        com_tarefa = self.servico()
        Tarefa.objects.create(servico=com_tarefa, responsavel=self.tecnico)

        response = self.client.patch(
            reverse('catalogos-detail', args=[self.catalogo.id]),
            {'setor': self.ergonomia.id, 'mover_servicos_em_aberto': True}, format='json',
        )

        self.assertEqual(response.data['servicos_movidos'], 1)
        recebido.refresh_from_db()
        com_tarefa.refresh_from_db()
        self.assertEqual((recebido.setor, recebido.recebido_em), (self.ergonomia, None))
        self.assertEqual(com_tarefa.setor, self.seguranca)
        self.assertTrue(RegistroAuditoria.objects.filter(
            objeto_id=recebido.pk, acao=AcaoAuditoria.ATUALIZACAO, motivo__contains='Ergonomia',
        ).exists())

    def test_mudar_em_lote(self):
        self.ergonomia_recebe()
        outro = Catalogo.objects.create(nome='ERGONOMIA - PSICOSSOCIAL', setor=self.seguranca)
        self.servico(catalogo=outro)

        response = self.client.post(reverse('catalogos-mudar-setor'), {
            'catalogos': [self.catalogo.id, outro.id], 'setor': self.ergonomia.id, 'mover_servicos_em_aberto': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual((response.data['catalogos_alterados'], response.data['servicos_movidos']), (2, 1))
        self.assertEqual(len(response.data['avisos']), 1)  # Ergonomia ainda sem quem organize
        self.assertEqual(set(Catalogo.objects.values_list('setor', flat=True)), {self.ergonomia.id})

    def test_lote_recusa_setor_sem_quem_receba(self):
        response = self.client.post(reverse('catalogos-mudar-setor'), {
            'catalogos': [self.catalogo.id], 'setor': self.ergonomia.id,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.catalogo.refresh_from_db()
        self.assertEqual(self.catalogo.setor, self.seguranca)

    def test_lote_exige_gerenciar_catalogo(self):
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.post(reverse('catalogos-mudar-setor'), {
            'catalogos': [self.catalogo.id], 'setor': self.seguranca.id,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PapelDoSetorTestCase(SetorDoCatalogoBase):
    def setor(self, setor):
        return self.client.get(reverse('setores-detail', args=[setor.id])).data

    def test_setor_que_executa(self):
        dados = self.setor(self.seguranca)

        self.assertEqual(
            (dados['executa_servicos'], dados['catalogos_ativos'], dados['recebem_tarefas'], dados['sem_quem_receba']),
            (True, 1, 1, False),
        )

    def test_setor_que_executa_sem_quem_receba(self):
        Catalogo.objects.create(nome='AET', setor=self.ergonomia)

        dados = self.setor(self.ergonomia)

        self.assertTrue(dados['sem_quem_receba'])
        self.assertTrue(dados['sem_organizador'])

    def test_setor_que_nao_executa(self):
        dados = self.setor(self.ergonomia)

        self.assertEqual((dados['executa_servicos'], dados['sem_quem_receba'], dados['sem_organizador']), (False, False, False))


class CobrancaExigeVerValoresTestCase(APITestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.client.force_authenticate(user=self.diretor)
        self.organizacao = Organizacao.objects.get(nome='Ergogroup')

    def criar_funcao(self, permissoes):
        return self.client.post(reverse('funcoes-list'), {
            'organizacao': self.organizacao.id, 'nome': 'Faturista', 'setores': [setor_padrao().id],
            'permissoes': permissoes,
        }, format='json')

    def test_funcao_com_cobranca_sem_ver_valores_e_recusada(self):
        response = self.criar_funcao([Permissao.FINANCEIRO_REGISTRAR_COBRANCA])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ver valores', str(response.data['permissoes']))

    def test_funcao_com_as_duas_e_aceita(self):
        response = self.criar_funcao([Permissao.FINANCEIRO_REGISTRAR_COBRANCA, Permissao.FINANCEIRO_VER_VALORES])

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_tirar_ver_valores_de_quem_registra_cobranca_e_recusado(self):
        funcao = Funcao.objects.get(nome='Financeiro')
        sem_valores = [p for p in funcao.codigos_permissao if p != Permissao.FINANCEIRO_VER_VALORES]

        response = self.client.patch(reverse('funcoes-detail', args=[funcao.id]), {'permissoes': sem_valores}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cobrancas_exigem_ver_valores(self):
        funcao = Funcao.objects.create(organizacao=self.organizacao, nome='Só cobra')
        funcao.setores.add(setor_padrao())
        funcao.definir_permissoes([Permissao.FINANCEIRO_REGISTRAR_COBRANCA])
        pessoa = criar_usuario(None)
        pessoa.vinculos_setor.create(setor=setor_padrao(), funcao=funcao)
        self.client.force_authenticate(user=pessoa)

        response = self.client.get(reverse('financeiro-cobrancas'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
