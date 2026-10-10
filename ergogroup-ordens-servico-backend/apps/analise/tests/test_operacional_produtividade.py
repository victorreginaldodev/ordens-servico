from decimal import Decimal

from django.urls import reverse
from rest_framework import status

from apps.organizacoes.apoio_testes import Perfil, criar_usuario_com_perfil
from apps.ordens_servico.models import Servico, Tarefa

from .fixtures import AnaliseTestCase


class OperacionalAnaliseViewProdutividadeTests(AnaliseTestCase):
    url = reverse('analise-operacional')

    def test_tempos_medios(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tempos = response.data['tempos_medios']
        self.assertIn('tempo_por_catalogo_servico', tempos)
        self.assertIn('tempo_por_catalogo_oso', tempos)

    def test_taxa_cancelamento(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        taxa = response.data['taxa_cancelamento']
        self.assertEqual(taxa['tarefas']['canceladas'], 1)
        self.assertEqual(taxa['tarefas']['total'], Tarefa.objects.count())
        self.assertEqual(taxa['servicos']['total'], Servico.objects.count())
        self.assertEqual(
            taxa['servicos']['canceladas'],
            Servico.objects.filter(status='cancelado').count(),
        )

    def test_cancelamento_por_catalogo(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        por_catalogo = {
            item['catalogo_id']: item
            for item in response.data['taxa_cancelamento']['por_catalogo']
        }
        base = por_catalogo[self.catalogo.id]
        secundario = por_catalogo[self.catalogo_secundario.id]

        self.assertEqual(base['canceladas'], 1)
        self.assertEqual(secundario['total'], 2)
        self.assertEqual(secundario['canceladas'], 1)
        self.assertEqual(secundario['percentual'], 50.0)

    def test_gestor_ve_todos_os_tecnicos(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        ids = {item['tecnico_id'] for item in response.data['por_tecnico']}
        self.assertIn(self.tecnico.id, ids)
        self.assertIn(self.outro_tecnico.id, ids)

    def test_tecnico_ve_apenas_a_propria_linha_com_carga_de_trabalho(self):
        self._login(self.tecnico)
        response = self.client.get(self.url)

        por_tecnico = response.data['por_tecnico']
        self.assertEqual(len(por_tecnico), 1)
        linha = por_tecnico[0]
        self.assertEqual(linha['tecnico_id'], self.tecnico.id)
        self.assertEqual(linha['tarefas_concluidas'], 1)
        self.assertEqual(linha['mini_os_concluidas'], 1)
        self.assertEqual(linha['tempo_medio_tarefa_dias'], 3.0)
        # tarefa_wip e tarefa_lead_time estao em andamento; oso_wip tambem.
        self.assertEqual(linha['tarefas_em_aberto'], 2)
        self.assertEqual(linha['mini_os_em_aberto'], 1)
        # tarefa_wip tem prazo no passado; tarefa_lead_time tem prazo no futuro.
        self.assertEqual(linha['tarefas_atrasadas'], 1)
        # tarefa_wip e tarefa_lead_time sao alta prioridade (atrasada ou nao).
        self.assertEqual(linha['tarefas_alta_prioridade_abertas'], 2)
        # Horas e complexidade saíram do serviço e da tarefa (ADR 0005).
        self.assertNotIn('complexidade_media_concluidas', linha)
        self.assertNotIn('horas_estimadas_entregues', linha)
        # self.tecnico nao tem nenhuma tarefa/OSO concluida COM prazo definido.
        self.assertIsNone(linha['taxa_cumprimento_prazo_tarefas'])
        self.assertIsNone(linha['taxa_cumprimento_prazo_minios'])

    def test_tempo_por_catalogo_de_servico_nao_tem_horas_nem_complexidade(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        entradas = {
            item['catalogo_id']: item
            for item in response.data['tempos_medios']['tempo_por_catalogo_servico']
        }
        entrada = entradas[self.catalogo.id]
        self.assertIsNone(entrada['horas_estimadas'])
        self.assertIsNone(entrada['complexidade'])

    def test_taxa_cumprimento_prazo_global(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        taxa = response.data['taxa_cumprimento_prazo']
        self.assertEqual(taxa['tarefas']['total_com_prazo'], 2)
        self.assertEqual(taxa['tarefas']['no_prazo'], 1)
        self.assertEqual(taxa['tarefas']['percentual'], 50.0)
        self.assertEqual(taxa['minios']['total_com_prazo'], 2)
        self.assertEqual(taxa['minios']['no_prazo'], 1)
        self.assertEqual(taxa['minios']['percentual'], 50.0)

    def test_taxa_cumprimento_prazo_por_tecnico(self):
        self._login(self.usuarios[Perfil.GESTOR_TECNICO])
        response = self.client.get(self.url)

        linha_outro = next(
            item for item in response.data['por_tecnico'] if item['tecnico_id'] == self.outro_tecnico.id
        )
        self.assertEqual(linha_outro['taxa_cumprimento_prazo_tarefas'], 50.0)
        self.assertEqual(linha_outro['taxa_cumprimento_prazo_minios'], 50.0)
