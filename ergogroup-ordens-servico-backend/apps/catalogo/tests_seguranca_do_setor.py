"""Travas da revisão do catálogo (itens 2 e 3): a regra "catálogo ativo só em setor com quem receba" continua valendo
depois de salvar, e trocar o catálogo de um serviço não deixa tarefas presas no setor errado."""
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import RegistroAuditoria
from apps.catalogo.admin import CatalogoAdminForm
from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import AtuacaoEmSetor, Organizacao, Setor


class SegurancaDoSetorBase(APITestCase):
    def setUp(self):
        self.seguranca = setor_padrao()
        self.ergonomia = Setor.objects.create(organizacao=Organizacao.objects.get(nome='Ergogroup'), nome='Ergonomia')
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.tecnico = criar_usuario(Perfil.TECNICO)
        self.ergonomista = criar_usuario(Perfil.TECNICO, nome_completo='Ergonomista')
        # O único que recebe tarefas na Ergonomia: lotado na Segurança, também executa lá.
        AtuacaoEmSetor.objects.create(usuario=self.ergonomista, setor=self.ergonomia)
        self.client.force_authenticate(user=self.diretor)
        self.aet = Catalogo.objects.create(nome='AET', setor=self.ergonomia)
        self.pgr = Catalogo.objects.create(nome='PGR', setor=self.seguranca)
        self.ltcat = Catalogo.objects.create(nome='LTCAT', setor=self.seguranca)
        self.ordem = OrdemServico.objects.create(
            cliente=Cliente.objects.create(nome='Cliente'), data_venda=timezone.localdate(), valor=0,
        )

    def tirar_quem_recebe_na_ergonomia(self):
        AtuacaoEmSetor.objects.filter(setor=self.ergonomia).delete()

    def venda(self, *catalogos):
        return self.client.post(reverse('ordens-servico-list'), {
            'cliente': self.ordem.cliente_id, 'data_venda': timezone.localdate().isoformat(), 'valor': '1000.00',
            'tipo_condicao': 'a_vista', 'data_acordada_cobranca': '2026-11-10',
            'servicos': [{'catalogo': catalogo.id, 'descricao': catalogo.nome} for catalogo in catalogos],
        }, format='json')


class DesativarSetorTestCase(SegurancaDoSetorBase):
    def test_nao_desativa_setor_com_catalogos_ativos(self):
        response = self.client.patch(reverse('setores-detail', args=[self.ergonomia.id]), {'ativo': False}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('1 catálogo ativo', str(response.data['ativo']))
        self.ergonomia.refresh_from_db()
        self.assertTrue(self.ergonomia.ativo)

    def test_desativa_setor_cujos_catalogos_estao_inativos(self):
        self.aet.ativo = False
        self.aet.save()

        response = self.client.patch(reverse('setores-detail', args=[self.ergonomia.id]), {'ativo': False}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_editar_outro_campo_de_setor_com_catalogos_nao_e_barrado(self):
        response = self.client.patch(reverse('setores-detail', args=[self.ergonomia.id]), {'descricao': 'AET e AEP'})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)


class AvisoDeQuemRecebeTestCase(SegurancaDoSetorBase):
    def test_tirar_tambem_executa_em_avisa_mas_nao_barra(self):
        response = self.client.patch(
            reverse('usuarios-detail', args=[self.ergonomista.id]), {'tambem_executa_em': []}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data['avisos']), 1)
        self.assertIn('"Ergonomia"', response.data['avisos'][0])
        self.assertFalse(AtuacaoEmSetor.objects.filter(usuario=self.ergonomista).exists())

    def test_desativar_a_pessoa_avisa(self):
        response = self.client.patch(reverse('usuarios-desativar', args=[self.ergonomista.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(any('"Ergonomia"' in aviso for aviso in response.data['avisos']))

    def test_mudanca_que_nao_tira_ninguem_nao_avisa(self):
        response = self.client.patch(
            reverse('usuarios-detail', args=[self.ergonomista.id]), {'nome_completo': 'Ergonomista Sênior'}, format='json',
        )

        self.assertEqual(response.data['avisos'], [])

    def test_setor_que_ja_estava_sem_quem_receba_nao_repete_o_aviso(self):
        self.tirar_quem_recebe_na_ergonomia()

        response = self.client.patch(reverse('usuarios-desativar', args=[self.tecnico.id]))

        self.assertFalse(any('"Ergonomia"' in aviso for aviso in response.data['avisos']))


class VendaTestCase(SegurancaDoSetorBase):
    def test_venda_para_setor_sem_quem_receba_e_registrada_com_aviso(self):
        self.tirar_quem_recebe_na_ergonomia()

        response = self.venda(self.aet, self.pgr)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(len(response.data['avisos']), 1)
        self.assertIn('"Ergonomia"', response.data['avisos'][0])

    def test_venda_normal_vem_sem_avisos(self):
        response = self.venda(self.aet, self.pgr)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['avisos'], [])

    def test_nao_vende_catalogo_de_setor_inativo(self):
        Setor.objects.filter(pk=self.ergonomia.pk).update(ativo=False)

        response = self.venda(self.aet)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('está inativo', str(response.data['servicos']))

    def test_acrescentar_servico_avisa_o_setor_sem_quem_receba(self):
        self.tirar_quem_recebe_na_ergonomia()

        response = self.client.post(
            reverse('servicos-list'), {'ordem_servico': self.ordem.id, 'catalogo': self.aet.id, 'descricao': 'AET'},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(len(response.data['avisos']), 1)

    def test_servico_novo_exige_catalogo(self):
        response = self.client.post(reverse('servicos-list'), {'ordem_servico': self.ordem.id, 'descricao': 'Avulso'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('catalogo', response.data)


class AdminDoCatalogoTestCase(SegurancaDoSetorBase):
    def test_admin_nao_ativa_catalogo_em_setor_sem_quem_receba(self):
        self.tirar_quem_recebe_na_ergonomia()

        form = CatalogoAdminForm(data={'nome': 'AEP', 'setor': self.ergonomia.id, 'ativo': True})

        self.assertFalse(form.is_valid())
        self.assertIn('não tem quem receba tarefas', str(form.errors))

    def test_admin_aceita_catalogo_inativo_em_setor_sem_quem_receba(self):
        self.tirar_quem_recebe_na_ergonomia()

        form = CatalogoAdminForm(data={'nome': 'AEP', 'setor': self.ergonomia.id, 'ativo': False})

        self.assertTrue(form.is_valid(), form.errors)


class TrocarCatalogoDoServicoTestCase(SegurancaDoSetorBase):
    def servico(self, catalogo=None):
        return Servico.objects.create(ordem_servico=self.ordem, descricao='Serviço', catalogo=catalogo or self.pgr)

    def trocar(self, servico, catalogo):
        return self.client.patch(reverse('servicos-detail', args=[servico.id]), {'catalogo': catalogo.id}, format='json')

    def test_com_tarefas_nao_troca_para_catalogo_de_outro_setor(self):
        servico = self.servico()
        Tarefa.objects.create(servico=servico, responsavel=self.tecnico)

        response = self.trocar(servico, self.aet)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('já tem tarefas', str(response.data['catalogo']))
        servico.refresh_from_db()
        self.assertEqual((servico.catalogo, servico.setor), (self.pgr, self.seguranca))

    def test_com_tarefas_troca_para_catalogo_do_mesmo_setor(self):
        servico = self.servico()
        Tarefa.objects.create(servico=servico, responsavel=self.tecnico)

        response = self.trocar(servico, self.ltcat)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        servico.refresh_from_db()
        self.assertEqual((servico.catalogo, servico.setor), (self.ltcat, self.seguranca))

    def test_sem_tarefas_passa_ao_setor_novo_com_recebimento_zerado(self):
        servico = self.servico()
        servico.registrar_recebimento(self.diretor)

        response = self.trocar(servico, self.aet)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        servico.refresh_from_db()
        self.assertEqual((servico.catalogo, servico.setor), (self.aet, self.ergonomia))
        self.assertIsNone(servico.recebido_em)
        self.assertIsNone(servico.recebido_por)
        self.assertTrue(RegistroAuditoria.objects.filter(objeto_id=servico.pk, entidade='servico').exists())

    def test_nao_tira_o_catalogo_do_servico(self):
        servico = self.servico()

        response = self.client.patch(reverse('servicos-detail', args=[servico.id]), {'catalogo': None}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sem_permissao_no_setor_de_destino_nao_troca(self):
        servico = self.servico()
        self.client.force_authenticate(user=criar_usuario(Perfil.SUB_GESTOR_TECNICO))

        response = self.trocar(servico, self.aet)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.data)
