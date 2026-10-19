"""Setor do catálogo e papel do setor (revisão de permissões e setores de 14/10/2026, P5, P6 e P7; serviços com
tarefas indo junto, revisão de 16/10/2026)."""
import importlib
import io
from contextlib import redirect_stdout
from unittest import mock

from django.apps import apps as django_apps
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroAuditoria
from apps.catalogo.models import Catalogo
from apps.catalogo.services import CONTADORES
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa
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


class LevarServicosComTarefasTestCase(SetorDoCatalogoBase):
    """Revisão de 16/10/2026: duas caixas ao mudar o setor, e os distribuídos também podem ir junto."""

    def setUp(self):
        super().setUp()
        self.ergonomia_recebe()

    def distribuido(self, status_da_tarefa=StatusTarefa.ABERTA, responsavel=None):
        servico = self.servico(recebido=True)
        tarefa = Tarefa.objects.create(servico=servico, responsavel=responsavel or self.tecnico, status=status_da_tarefa)
        servico.refresh_from_db()
        return servico, tarefa

    def mudar(self, **dados):
        return self.client.patch(reverse('catalogos-detail', args=[self.catalogo.id]), dados, format='json')

    def contadores(self):
        dados = self.client.get(reverse('catalogos-detail', args=[self.catalogo.id])).data
        return tuple(dados[campo] for campo in CONTADORES)

    def test_contadores_separam_em_aberto_e_com_tarefas(self):
        self.servico()
        self.distribuido()
        em_andamento, _ = self.distribuido(StatusTarefa.EM_ANDAMENTO)
        self.distribuido(StatusTarefa.CONCLUIDA)

        self.assertEqual(em_andamento.status, StatusServico.EM_ANDAMENTO)
        self.assertEqual(self.contadores(), (1, 2, 0, 0))

    def test_leva_os_distribuidos_com_as_tarefas_e_deixa_os_concluidos(self):
        aberto = self.servico()
        distribuido, tarefa = self.distribuido()
        em_andamento, _ = self.distribuido(StatusTarefa.EM_ANDAMENTO)
        concluido, _ = self.distribuido(StatusTarefa.CONCLUIDA)
        recebido_em = distribuido.recebido_em

        response = self.mudar(setor=self.ergonomia.id, mover_servicos_com_tarefas=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['servicos_movidos'], 2)
        for servico in (aberto, distribuido, em_andamento, concluido, tarefa):
            servico.refresh_from_db()
        self.assertEqual((distribuido.setor, em_andamento.setor), (self.ergonomia, self.ergonomia))
        self.assertEqual((aberto.setor, concluido.setor), (self.seguranca, self.seguranca))
        self.assertEqual(distribuido.recebido_em, recebido_em)
        self.assertEqual(tarefa.responsavel, self.tecnico)
        self.assertTrue(RegistroAuditoria.objects.filter(
            objeto_id=distribuido.pk, acao=AcaoAuditoria.ATUALIZACAO, motivo__contains='com as tarefas',
        ).exists())

    def test_as_duas_caixas_levam_todos_os_ativos(self):
        aberto = self.servico(recebido=True)
        distribuido, _ = self.distribuido()

        response = self.mudar(setor=self.ergonomia.id, mover_servicos_em_aberto=True, mover_servicos_com_tarefas=True)

        self.assertEqual(response.data['servicos_movidos'], 2)
        aberto.refresh_from_db()
        distribuido.refresh_from_db()
        self.assertEqual((aberto.setor, aberto.recebido_em), (self.ergonomia, None))
        self.assertEqual(distribuido.setor, self.ergonomia)

    def test_aviso_de_chegada_so_para_os_em_aberto(self):
        aberto = self.servico()
        self.distribuido()

        with mock.patch('apps.ordens_servico.services.venda.avisar_chegada') as avisar:
            self.mudar(setor=self.ergonomia.id, mover_servicos_em_aberto=True, mover_servicos_com_tarefas=True)

        self.assertEqual([servico.pk for servico in avisar.call_args.args[0]], [aberto.pk])

    def test_responsavel_de_outro_setor_continua_atualizando_a_tarefa(self):
        de_seguranca = criar_usuario(Perfil.TECNICO)
        distribuido, tarefa = self.distribuido(responsavel=de_seguranca)
        self.mudar(setor=self.ergonomia.id, mover_servicos_com_tarefas=True)
        self.client.force_authenticate(user=de_seguranca)

        response = self.client.patch(reverse('tarefas-detail', args=[tarefa.id]), {'status': 'em_andamento'})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        distribuido.refresh_from_db()
        self.assertEqual((distribuido.setor, distribuido.status), (self.ergonomia, StatusServico.EM_ANDAMENTO))

    def test_traz_os_que_ficaram_para_tras_sem_mudar_o_setor(self):
        aberto = self.servico()
        distribuido, _ = self.distribuido()
        self.mudar(setor=self.ergonomia.id)
        self.assertEqual(self.contadores(), (1, 1, 1, 1))

        response = self.mudar(mover_servicos_em_aberto=True, mover_servicos_com_tarefas=True)

        self.assertEqual(response.data['servicos_movidos'], 2)
        self.assertEqual(
            (response.data['servicos_em_aberto_fora_do_setor'], response.data['servicos_com_tarefas_fora_do_setor']),
            (0, 0),
        )
        aberto.refresh_from_db()
        distribuido.refresh_from_db()
        self.assertEqual((aberto.setor, distribuido.setor), (self.ergonomia, self.ergonomia))

    def test_lote_leva_os_com_tarefas(self):
        distribuido, _ = self.distribuido()

        response = self.client.post(reverse('catalogos-mudar-setor'), {
            'catalogos': [self.catalogo.id], 'setor': self.ergonomia.id, 'mover_servicos_com_tarefas': True,
        }, format='json')

        self.assertEqual(response.data['servicos_movidos'], 1)
        distribuido.refresh_from_db()
        self.assertEqual(distribuido.setor, self.ergonomia)

    def test_linha_do_tempo_mostra_a_mudanca_de_setor(self):
        distribuido, _ = self.distribuido()
        self.mudar(setor=self.ergonomia.id, mover_servicos_com_tarefas=True)

        eventos = self.client.get(reverse('servicos-linha-do-tempo', args=[distribuido.id])).data

        self.assertIn(
            'ERGONOMIA - AET passou de Segurança do Trabalho para Ergonomia',
            [evento['texto'] for evento in eventos if evento['tipo'] == 'setor_alterado'],
        )


class MigracaoDosServicosDeErgonomiaTestCase(SetorDoCatalogoBase):
    """Correção única de 16/10/2026 (`ordens_servico/0051`)."""

    def test_leva_os_ativos_dos_catalogos_que_ja_estao_em_ergonomia(self):
        AtuacaoEmSetor.objects.create(usuario=self.tecnico, setor=self.ergonomia)
        aberto = self.servico(recebido=True)
        distribuido = self.servico(recebido=True)
        Tarefa.objects.create(servico=distribuido, responsavel=self.tecnico)
        concluido = self.servico()
        Tarefa.objects.create(servico=concluido, responsavel=self.tecnico, status=StatusTarefa.CONCLUIDA)
        de_seguranca = self.servico(catalogo=Catalogo.objects.create(nome='PGR', setor=self.seguranca))
        Catalogo.objects.filter(pk=self.catalogo.pk).update(setor=self.ergonomia)
        recebido_em = Servico.objects.get(pk=distribuido.pk).recebido_em
        migracao = importlib.import_module('apps.ordens_servico.migrations.0051_leva_servicos_ativos_para_ergonomia')

        with redirect_stdout(io.StringIO()):
            migracao.levar(django_apps, None)

        for servico in (aberto, distribuido, concluido, de_seguranca):
            servico.refresh_from_db()
        self.assertEqual((aberto.setor, aberto.recebido_em), (self.ergonomia, None))
        self.assertEqual((distribuido.setor, distribuido.recebido_em), (self.ergonomia, recebido_em))
        self.assertEqual((concluido.setor, de_seguranca.setor), (self.seguranca, self.seguranca))
        registros = RegistroAuditoria.objects.filter(motivo__contains='migração 0051')
        self.assertEqual(sorted(registros.values_list('objeto_id', flat=True)), sorted([aberto.pk, distribuido.pk]))
        self.assertEqual(
            registros.get(objeto_id=distribuido.pk).alteracoes,
            {'setor_id': {'antes': self.seguranca.pk, 'depois': self.ergonomia.pk}},
        )


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
        self.client.force_authenticate(user=criar_usuario(None, is_superuser=True))
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
        self.client.force_authenticate(user=criar_usuario(None, is_superuser=True))

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
