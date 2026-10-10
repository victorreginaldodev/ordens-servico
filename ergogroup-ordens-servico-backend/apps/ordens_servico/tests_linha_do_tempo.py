from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.auditoria.models import AcaoAuditoria, EntidadeAuditada, OrigemAuditoria, RegistroAuditoria
from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao


class LinhaDoTempoTestCase(APITestCase):
    """Uma venda percorre o fluxo inteiro pela API, autenticada por JWT como o frontend faz."""

    def como(self, usuario):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(usuario)}')

    def setUp(self):
        hoje = timezone.localdate()
        self.comercial = criar_usuario(Perfil.COMERCIAL, nome_completo='Vendedora')
        self.gestor = criar_usuario(Perfil.GESTOR_TECNICO, nome_completo='Gestora Técnica')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Um')
        self.financeiro = criar_usuario(Perfil.FINANCEIRO, nome_completo='Analista Financeira')
        self.outro_tecnico = criar_usuario(Perfil.TECNICO)
        pgr = Catalogo.objects.create(nome='PGR', setor=setor_padrao())
        ltcat = Catalogo.objects.create(nome='LTCAT', setor=setor_padrao())

        self.como(self.comercial)
        venda = self.client.post(reverse('ordens-servico-list'), {
            'cliente': Cliente.objects.create(nome='Cliente Linha do Tempo').id, 'data_venda': hoje.isoformat(),
            'valor': '6000.00', 'tipo_condicao': 'parcelado', 'quantidade_parcelas': 2,
            'data_acordada_cobranca': '2026-11-10',
            'servicos': [{'catalogo': pgr.id, 'descricao': 'PGR'}, {'catalogo': ltcat.id, 'descricao': 'LTCAT'}],
        }, format='json').data
        self.ordem = OrdemServico.objects.get(pk=venda['id'])
        self.pgr, self.ltcat = (Servico.objects.get(pk=item['id']) for item in venda['servicos'])

        self.como(self.gestor)
        for servico in (self.pgr, self.ltcat):
            self.client.post(reverse('execucao-distribuir', args=[servico.id]), {'tarefas': [
                {'responsavel': self.tecnico.id, 'prazo': (hoje + timedelta(days=10)).isoformat()},
            ]}, format='json')
        self.tarefa_pgr = self.pgr.tarefas.get()
        self.client.patch(reverse('tarefas-detail', args=[self.tarefa_pgr.id]),
                          {'prazo': (hoje + timedelta(days=20)).isoformat()})

        self.como(self.tecnico)
        Servico.objects.filter(pk=self.ltcat.pk).update(ultima_movimentacao_em=timezone.now() - timedelta(days=9))
        self.client.post(reverse('execucao-ciencia', args=[self.ltcat.id]), {'motivo': 'cliente'})
        for servico in (self.pgr, self.ltcat):
            tarefa = servico.tarefas.get()
            for novo_status in ('em_andamento', 'concluida'):
                self.client.patch(reverse('tarefas-detail', args=[tarefa.id]), {'status': novo_status})

        self.como(self.financeiro)
        self.client.patch(reverse('ordens-servico-registrar-cobranca', args=[self.ordem.id]),
                          {'referencia_lancamento': 'NF 777'}, format='json')

    def linha_do_tempo(self, usuario, rota='ordens-servico-linha-do-tempo', objeto=None):
        self.como(usuario)
        return self.client.get(reverse(rota, args=[(objeto or self.ordem).id]))

    def test_conta_a_venda_do_inicio_ao_fim(self):
        eventos = self.linha_do_tempo(self.comercial).data
        tipos = [evento['tipo'] for evento in eventos]

        esperados = ['venda', 'chegada', 'chegada', 'distribuicao', 'distribuicao', 'prazo_alterado', 'ciencia',
                     'tarefa_iniciada', 'tarefa_concluida', 'servico_concluido', 'tarefa_iniciada',
                     'tarefa_concluida', 'servico_concluido', 'os_concluida', 'liberacao', 'lancamento']
        self.assertEqual([tipo for tipo in tipos if tipo in esperados], esperados)
        textos = {evento['tipo']: evento for evento in eventos}
        self.assertEqual(textos['venda']['quem'], 'Vendedora')
        self.assertIn('Parcelado em 2x', textos['venda']['texto'])
        self.assertEqual(textos['chegada']['texto'], 'LTCAT chegou a Segurança do Trabalho')
        self.assertIn('distribuído para Técnico Um, prazo', textos['distribuicao']['texto'])
        self.assertEqual(textos['distribuicao']['quem'], 'Gestora Técnica')
        self.assertIn('Prazo de PGR (Técnico Um) alterado de', textos['prazo_alterado']['texto'])
        self.assertEqual(textos['ciencia']['texto'],
                         'Técnico Um confirmou que está tudo bem com LTCAT (aguardando o cliente)')
        self.assertEqual(textos['tarefa_concluida']['quem'], 'Técnico Um')
        self.assertEqual(textos['lancamento']['texto'], 'OS faturada por Analista Financeira (ref. NF 777)')
        self.assertEqual(textos['lancamento']['quem'], 'Analista Financeira')

    def test_quem_nao_ve_valores_nao_ve_condicao_nem_referencia(self):
        eventos = {evento['tipo']: evento for evento in self.linha_do_tempo(self.tecnico).data}

        self.assertEqual(eventos['venda']['texto'], 'Venda registrada')
        self.assertEqual(eventos['lancamento']['texto'], 'OS faturada por Analista Financeira')

    def test_linha_do_tempo_do_servico_traz_so_o_servico(self):
        eventos = self.linha_do_tempo(self.tecnico, 'servicos-linha-do-tempo', self.pgr).data

        self.assertEqual({evento['servico_id'] for evento in eventos}, {self.pgr.id})
        self.assertNotIn('venda', [evento['tipo'] for evento in eventos])

    def test_quem_nao_ve_a_os_recebe_404(self):
        self.assertEqual(self.linha_do_tempo(self.outro_tecnico).status_code, status.HTTP_404_NOT_FOUND)

    def test_os_anterior_a_auditoria_avisa_que_o_historico_comeca_depois(self):
        RegistroAuditoria.objects.create(
            entidade=EntidadeAuditada.ORDEM_SERVICO, objeto_id=self.ordem.id, acao=AcaoAuditoria.BACKFILL,
            origem=OrigemAuditoria.MIGRACAO, ordem_servico_id=self.ordem.id, snapshot={}, alteracoes={},
        )

        eventos = self.linha_do_tempo(self.comercial).data

        self.assertEqual(sum(1 for evento in eventos if evento['tipo'] == 'historico_anterior'), 1)
        self.assertNotIn('backfill', [evento['tipo'] for evento in eventos])
