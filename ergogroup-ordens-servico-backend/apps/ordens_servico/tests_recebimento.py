"""Ciência de recebimento no serviço e na tarefa (ADR 0009; fase 13 do plano de execução)."""
import importlib
from datetime import timedelta

from django.apps import apps as django_apps
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from apps.ordens_servico.models import Servico, Tarefa
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.services.execucao import etapa_do_servico
from apps.ordens_servico.tests_blocos_execucao import BlocosBase


class RecebimentoBase(BlocosBase):
    def receber_servicos(self, usuario, *servicos):
        self.client.force_authenticate(user=usuario)
        return self.client.post(
            reverse('execucao-receber-servicos'), {'servicos': [servico.id for servico in servicos]}, format='json',
        )

    def receber_tarefas(self, usuario, *tarefas):
        self.client.force_authenticate(user=usuario)
        return self.client.post(
            reverse('execucao-receber-tarefas'), {'tarefas': [tarefa.id for tarefa in tarefas]}, format='json',
        )

    def etapa(self, servico):
        return etapa_do_servico(Servico.objects.prefetch_related('tarefas').get(pk=servico.pk))

    def patch_tarefa(self, usuario, tarefa, dados):
        self.client.force_authenticate(user=usuario)
        return self.client.patch(reverse('tarefas-detail', args=[tarefa.id]), dados, format='json')


class EtapasDoServicoTestCase(RecebimentoBase):
    def test_percorre_novo_a_distribuir_distribuido_em_execucao_concluido(self):
        self.assertEqual(self.etapa(self.na_fila), 'novo')

        response = self.receber_servicos(self.gestor, self.na_fila)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'recebidos': [self.na_fila.id], 'ja_recebidos': []})
        self.assertEqual(self.etapa(self.na_fila), 'a_distribuir')
        self.na_fila.refresh_from_db()
        self.assertEqual(self.na_fila.recebido_por, self.gestor)

        tarefa = Tarefa.objects.create(servico=self.na_fila, responsavel=self.tecnico)
        self.assertEqual(self.etapa(self.na_fila), 'distribuido')
        tarefa.status = StatusTarefa.EM_ANDAMENTO
        tarefa.save()
        self.assertEqual(self.etapa(self.na_fila), 'em_execucao')
        tarefa.status = StatusTarefa.CONCLUIDA
        tarefa.save()
        self.assertEqual(self.etapa(self.na_fila), 'concluido')

    def test_excluir_todas_as_tarefas_volta_para_a_distribuir(self):
        self.receber_servicos(self.gestor, self.na_fila)
        tarefa = Tarefa.objects.create(servico=self.na_fila, responsavel=self.tecnico)
        tarefa.delete()

        self.assertEqual(self.etapa(self.na_fila), 'a_distribuir')

    def test_distribuir_um_servico_novo_registra_a_ciencia_de_quem_distribuiu(self):
        self.client.force_authenticate(user=self.gestor)
        self.client.post(reverse('execucao-distribuir', args=[self.na_fila.id]),
                         {'tarefas': [{'responsavel': self.tecnico.id}]}, format='json')

        self.na_fila.refresh_from_db()
        self.assertIsNotNone(self.na_fila.recebido_em)
        self.assertEqual(self.na_fila.recebido_por, self.gestor)

    def test_distribuir_nao_troca_a_ciencia_ja_dada(self):
        self.receber_servicos(self.coordenadora, self.da_ergonomia)
        recebido_em = Servico.objects.get(pk=self.da_ergonomia.pk).recebido_em
        self.client.force_authenticate(user=self.diretor)
        self.client.post(reverse('execucao-distribuir', args=[self.da_ergonomia.id]),
                         {'tarefas': [{'responsavel': self.coordenadora.id}]}, format='json')

        self.da_ergonomia.refresh_from_db()
        self.assertEqual((self.da_ergonomia.recebido_em, self.da_ergonomia.recebido_por),
                         (recebido_em, self.coordenadora))

    def test_ciencia_conta_como_movimentacao(self):
        self.envelhecer(self.na_fila, 10)
        self.assertTrue(Servico.objects.get(pk=self.na_fila.pk).em_alerta_sem_movimentacao)

        self.receber_servicos(self.gestor, self.na_fila)

        self.assertFalse(Servico.objects.get(pk=self.na_fila.pk).em_alerta_sem_movimentacao)


class ReceberServicosTestCase(RecebimentoBase):
    def test_em_lote_e_repetir_nao_muda_nada(self):
        self.receber_servicos(self.gestor, self.na_fila)
        primeira = Servico.objects.get(pk=self.na_fila.pk).recebido_em

        response = self.receber_servicos(self.diretor, self.na_fila, self.da_ergonomia)

        self.assertEqual(response.data, {'recebidos': [self.da_ergonomia.id], 'ja_recebidos': [self.na_fila.id]})
        servico = Servico.objects.get(pk=self.na_fila.pk)
        self.assertEqual((servico.recebido_em, servico.recebido_por), (primeira, self.gestor))

    def test_sem_permissao_em_um_setor_nada_e_gravado(self):
        response = self.receber_servicos(self.gestor, self.na_fila, self.da_ergonomia)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Servico.objects.filter(recebido_em__isnull=False, pk__in=[
            self.na_fila.pk, self.da_ergonomia.pk,
        ]).exists())

    def test_quem_nao_distribui_no_setor_nao_da_ciencia(self):
        # Quem não vê o serviço recebe 404, como nos outros blocos.
        for usuario in (self.tecnico, self.coordenadora):
            self.assertEqual(self.receber_servicos(usuario, self.na_fila).status_code, status.HTTP_404_NOT_FOUND)
        self.assertIsNone(Servico.objects.get(pk=self.na_fila.pk).recebido_em)

    def test_diretoria_da_ciencia_em_qualquer_setor(self):
        self.assertEqual(self.receber_servicos(self.diretor, self.da_ergonomia).status_code, status.HTTP_200_OK)

    def test_concluido_ou_cancelado_recebe_400(self):
        Servico.objects.filter(pk=self.na_fila.pk).update(status=StatusServico.CANCELADO)

        response = self.receber_servicos(self.gestor, self.na_fila)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.receber_servicos(self.gestor, self.concluido).status_code,
                         status.HTTP_400_BAD_REQUEST)

    def test_lista_vazia_recebe_400_e_inexistente_404(self):
        self.client.force_authenticate(user=self.gestor)
        vazia = self.client.post(reverse('execucao-receber-servicos'), {'servicos': []}, format='json')
        inexistente = self.client.post(reverse('execucao-receber-servicos'), {'servicos': [999999]}, format='json')

        self.assertEqual(vazia.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(inexistente.status_code, status.HTTP_404_NOT_FOUND)


class EtapasDaTarefaTestCase(RecebimentoBase):
    def setUp(self):
        super().setUp()
        self.tarefa = self.tarefa_distribuida

    def etapa_da_tarefa(self):
        return self.patch_tarefa(self.gestor, self.tarefa, {}).data['etapa']

    def test_percorre_nova_a_iniciar_em_andamento_concluida(self):
        self.assertEqual(self.etapa_da_tarefa(), 'nova')

        response = self.receber_tarefas(self.tecnico, self.tarefa)
        self.assertEqual(response.data, {'recebidas': [self.tarefa.id], 'ja_recebidas': []})
        self.assertEqual(self.etapa_da_tarefa(), 'a_iniciar')

        self.patch_tarefa(self.tecnico, self.tarefa, {'status': StatusTarefa.EM_ANDAMENTO})
        self.assertEqual(self.etapa_da_tarefa(), 'em_andamento')
        self.patch_tarefa(self.tecnico, self.tarefa, {'status': StatusTarefa.ABERTA})
        self.assertEqual(self.etapa_da_tarefa(), 'a_iniciar')
        self.patch_tarefa(self.tecnico, self.tarefa, {'status': StatusTarefa.CONCLUIDA})
        self.assertEqual(self.etapa_da_tarefa(), 'concluida')

    def test_comecar_sem_ciencia_registra_a_ciencia(self):
        self.patch_tarefa(self.tecnico, self.tarefa, {'status': StatusTarefa.EM_ANDAMENTO})

        self.assertIsNotNone(Tarefa.objects.get(pk=self.tarefa.pk).recebida_em)

    def test_trocar_o_responsavel_zera_e_mudar_o_prazo_mantem(self):
        self.receber_tarefas(self.tecnico, self.tarefa)

        self.patch_tarefa(self.gestor, self.tarefa, {'prazo': (self.hoje + timedelta(days=30)).isoformat()})
        self.assertIsNotNone(Tarefa.objects.get(pk=self.tarefa.pk).recebida_em)

        self.patch_tarefa(self.gestor, self.tarefa, {'responsavel': self.outro_tecnico.id})
        self.assertIsNone(Tarefa.objects.get(pk=self.tarefa.pk).recebida_em)

    def test_so_o_responsavel_da_ciencia(self):
        self.assertEqual(self.receber_tarefas(self.gestor, self.tarefa).status_code, status.HTTP_403_FORBIDDEN)
        # Quem não vê a tarefa recebe 404.
        self.assertEqual(self.receber_tarefas(self.outro_tecnico, self.tarefa).status_code, status.HTTP_404_NOT_FOUND)
        self.assertIsNone(Tarefa.objects.get(pk=self.tarefa.pk).recebida_em)

    def test_tudo_ou_nada_quando_uma_tarefa_nao_e_da_pessoa(self):
        outra = Tarefa.objects.create(servico=self.na_fila, responsavel=self.outro_tecnico)

        # O técnico não vê a tarefa do colega: 404, e a dele também não é gravada.
        self.assertEqual(self.receber_tarefas(self.tecnico, self.tarefa, outra).status_code,
                         status.HTTP_404_NOT_FOUND)
        self.assertIsNone(Tarefa.objects.get(pk=self.tarefa.pk).recebida_em)

    def test_tarefa_concluida_recebe_400(self):
        concluida = self.concluido.tarefas.get()
        self.assertEqual(self.receber_tarefas(self.outro_tecnico, concluida).status_code,
                         status.HTTP_400_BAD_REQUEST)

    def test_ciencia_da_tarefa_conta_como_movimentacao_e_nao_muda_a_etapa_do_servico(self):
        self.envelhecer(self.distribuido, 10)

        self.receber_tarefas(self.tecnico, self.tarefa)

        servico = Servico.objects.get(pk=self.distribuido.pk)
        self.assertFalse(servico.em_alerta_sem_movimentacao)
        self.assertEqual(self.etapa(servico), 'distribuido')


class AtribuicaoDaTarefaTestCase(RecebimentoBase):
    """B1 do plano de Meus serviços: a idade da tarefa nova conta da atribuição atual, não da criação."""

    def test_criar_marca_a_atribuicao(self):
        self.assertIsNotNone(Tarefa.objects.get(pk=self.tarefa_distribuida.pk).atribuida_em)

    def test_trocar_o_responsavel_reinicia_a_atribuicao_e_mudar_o_prazo_nao(self):
        antiga = timezone.now() - timedelta(days=20)
        Tarefa.objects.filter(pk=self.tarefa_distribuida.pk).update(atribuida_em=antiga)

        self.patch_tarefa(self.gestor, self.tarefa_distribuida, {'prazo': (self.hoje + timedelta(days=40)).isoformat()})
        self.assertEqual(Tarefa.objects.get(pk=self.tarefa_distribuida.pk).atribuida_em, antiga)

        self.patch_tarefa(self.gestor, self.tarefa_distribuida, {'responsavel': self.outro_tecnico.id})
        linha = next(l for l in self.get(self.outro_tecnico, 'execucao-meus-servicos').data
                     if l['tarefa_id'] == self.tarefa_distribuida.id)
        self.assertEqual((linha['atribuida_ha_dias'], linha['etapa']), (0, 'nova'))

    def test_linha_traz_a_prioridade_da_tarefa(self):
        Tarefa.objects.filter(pk=self.tarefa_distribuida.pk).update(prioridade='alta')

        linha = next(l for l in self.get(self.tecnico, 'execucao-meus-servicos').data
                     if l['tarefa_id'] == self.tarefa_distribuida.id)

        self.assertEqual(linha['prioridade'], 'alta')

    def test_migracao_preenche_a_atribuicao_com_a_criacao(self):
        Tarefa.objects.update(atribuida_em=None)
        migracao = importlib.import_module('apps.ordens_servico.migrations.0050_preenche_atribuida_em')

        migracao.preencher(django_apps, None)

        tarefa = Tarefa.objects.get(pk=self.tarefa_distribuida.pk)
        self.assertEqual(tarefa.atribuida_em, tarefa.criada_em)


class BlocosComRecebimentoTestCase(RecebimentoBase):
    def test_contadores_do_setor(self):
        self.receber_servicos(self.diretor, self.da_ergonomia)

        setores = {setor['nome']: setor for setor in self.get(self.diretor, 'execucao-setores').data}

        seguranca, ergonomia = setores['Segurança do Trabalho'], setores['Ergonomia']
        self.assertEqual((seguranca['novos'], seguranca['a_distribuir'], seguranca['tarefas_sem_ciencia']), (1, 0, 1))
        self.assertEqual((ergonomia['novos'], ergonomia['a_distribuir']), (0, 1))

    def test_fila_traz_novos_e_a_distribuir_com_o_filtro(self):
        outro = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR 2', catalogo=self.na_fila.catalogo)
        self.receber_servicos(self.gestor, self.na_fila)

        fila = self.get(self.gestor, 'execucao-fila', setor=self.seguranca.id).data
        self.assertEqual([(item['servico_id'], item['etapa']) for item in fila],
                         [(outro.id, 'novo'), (self.na_fila.id, 'a_distribuir')])
        self.assertEqual(fila[1]['recebido_por_nome'], 'Gestora Técnica')

        so_novos = self.get(self.gestor, 'execucao-fila', setor=self.seguranca.id, etapa='novo').data
        self.assertEqual([item['servico_id'] for item in so_novos], [outro.id])
        invalida = self.get(self.gestor, 'execucao-fila', setor=self.seguranca.id, etapa='distribuido')
        self.assertEqual(invalida.status_code, status.HTTP_400_BAD_REQUEST)

    def test_meus_servicos_por_etapa_e_contadores(self):
        self.receber_tarefas(self.tecnico, self.tarefa_distribuida)
        nova = Tarefa.objects.create(servico=self.na_fila, responsavel=self.tecnico)

        contadores = self.get(self.tecnico, 'execucao-meus-servicos-contadores').data
        self.assertEqual(contadores, {'nova': 1, 'a_iniciar': 1, 'em_andamento': 1})
        novas = self.get(self.tecnico, 'execucao-meus-servicos', etapa='nova').data
        self.assertEqual([(linha['tarefa_id'], linha['etapa']) for linha in novas], [(nova.id, 'nova')])

    def test_andamento_filtra_pela_etapa_da_tarefa(self):
        linhas = self.get(self.gestor, 'execucao-andamento', setor=self.seguranca.id, etapa='em_andamento').data

        self.assertEqual([linha['tarefa_id'] for linha in linhas], [self.tarefa_atrasada.id])

    def test_carga_da_equipe_mostra_tarefas_sem_ciencia(self):
        equipe = {linha['nome']: linha for linha in self.get(self.gestor, 'execucao-equipe',
                                                              setor=self.seguranca.id).data}

        self.assertEqual(equipe['Técnico Um']['sem_ciencia'], 1)
        self.assertEqual(equipe['Técnico Um']['sem_ciencia_mais_antiga_dias'], 0)

    def test_detalhe_diz_quem_pode_confirmar(self):
        self.client.force_authenticate(user=self.gestor)
        servico = self.client.get(reverse('execucao-servico', args=[self.na_fila.id])).data
        self.assertTrue(servico['pode_confirmar_recebimento'])

        self.client.force_authenticate(user=self.tecnico)
        distribuido = self.client.get(reverse('execucao-servico', args=[self.distribuido.id])).data
        self.assertFalse(distribuido['pode_confirmar_recebimento'])
        self.assertEqual([(t['etapa'], t['pode_confirmar_recebimento']) for t in distribuido['tarefas']],
                         [('nova', True)])

    def test_lista_de_vendas_filtra_novo_e_a_distribuir(self):
        def lista(etapa):
            self.client.force_authenticate(user=self.comercial)
            response = self.client.get(reverse('ordens-servico-list'), {'etapa': etapa})
            itens = response.data['results'] if isinstance(response.data, dict) else response.data
            return {item['id'] for item in itens}

        self.assertEqual((lista('novo'), lista('a_distribuir')), ({self.ordem.id}, set()))
        self.receber_servicos(self.gestor, self.na_fila)
        self.receber_servicos(self.coordenadora, self.da_ergonomia)
        self.assertEqual((lista('novo'), lista('a_distribuir')), (set(), {self.ordem.id}))


class LinhaDoTempoDoRecebimentoTestCase(RecebimentoBase):
    def eventos(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(self.diretor)}')
        response = self.client.get(reverse('ordens-servico-linha-do-tempo', args=[self.ordem.id]))
        self.client.credentials()
        return [(evento['tipo'], evento['texto']) for evento in response.data]

    def como(self, usuario):
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(usuario)}')

    def test_ciencias_dadas_pelas_pessoas_viram_eventos(self):
        self.como(self.gestor)
        self.client.post(reverse('execucao-receber-servicos'), {'servicos': [self.na_fila.id]}, format='json')
        self.como(self.tecnico)
        self.client.post(reverse('execucao-receber-tarefas'), {'tarefas': [self.tarefa_distribuida.id]},
                         format='json')

        eventos = self.eventos()
        self.assertIn(('recebimento', 'PGR recebido por Segurança do Trabalho (Gestora Técnica)'), eventos)
        self.assertIn(('tarefa_recebida', 'Técnico Um confirmou o recebimento de LTCAT'), eventos)

    def test_ciencia_automatica_nao_vira_evento(self):
        self.como(self.gestor)
        self.client.post(reverse('execucao-distribuir', args=[self.na_fila.id]),
                         {'tarefas': [{'responsavel': self.tecnico.id}]}, format='json')
        self.como(self.tecnico)
        tarefa = self.na_fila.tarefas.get()
        self.client.patch(reverse('tarefas-detail', args=[tarefa.id]), {'status': 'em_andamento'}, format='json')

        tipos = [tipo for tipo, _ in self.eventos()]
        self.assertNotIn('recebimento', tipos)
        self.assertNotIn('tarefa_recebida', tipos)
        self.assertIn('distribuicao', tipos)
        self.assertIn('tarefa_iniciada', tipos)


class MigracaoDoRecebimentoTestCase(RecebimentoBase):
    def test_ciencia_retroativa_so_onde_ja_havia_trabalho(self):
        Servico.objects.update(recebido_em=None, recebido_por=None)
        Tarefa.objects.update(recebida_em=None)
        migracao = importlib.import_module('apps.ordens_servico.migrations.0048_preenche_recebimento')

        migracao.preencher(django_apps, None)

        recebidos = set(Servico.objects.filter(recebido_em__isnull=False).values_list('pk', flat=True))
        self.assertEqual(recebidos, {self.distribuido.pk, self.em_execucao.pk, self.concluido.pk})
        tarefas = dict(Tarefa.objects.values_list('pk', 'recebida_em'))
        self.assertIsNone(tarefas[self.tarefa_distribuida.pk])
        self.assertEqual(timezone.localtime(tarefas[self.tarefa_atrasada.pk]).date(), self.hoje)
