"""Tarefa cancelada na conclusão do serviço, lista de Cobranças com as três situações, resumo para faturar e
conferência do faturamento (faturamento/04)."""
from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from io import StringIO
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import RegistroAuditoria
from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import LiberarEm, OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao


@override_settings(
    DIAS_ALERTA_SEM_LANCAMENTO=3, DIAS_ALERTA_SEM_MOVIMENTACAO=7, DIAS_CONFERENCIA_CONCLUIDO_OS_PARADA=15,
    DIAS_CONFERENCIA_SEM_DISTRIBUIR=3, DIAS_CONFERENCIA_VENCIMENTO=7,
)
class ConferenciaBase(APITestCase):
    def setUp(self):
        self.hoje = timezone.localdate()
        self.financeiro = criar_usuario(Perfil.FINANCEIRO, nome_completo='Analista Financeira')
        self.comercial = criar_usuario(Perfil.COMERCIAL, nome_completo='Vendedora Comercial')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Executor')
        self.cliente = Cliente.objects.create(nome='Cliente Conferência')
        self.pgr = Catalogo.objects.create(nome='PGR', setor=setor_padrao())
        self.pcmso = Catalogo.objects.create(nome='PCMSO', setor=setor_padrao())

    def venda(self, **campos):
        dados = {'cliente': self.cliente, 'data_venda': self.hoje, 'valor': Decimal('1000.00'),
                 'criado_por': self.comercial, **campos}
        return OrdemServico.objects.create(**dados)

    def servico(self, ordem, catalogo=None):
        catalogo = catalogo or self.pgr
        return Servico.objects.create(ordem_servico=ordem, descricao=catalogo.nome, catalogo=catalogo)

    def tarefa(self, servico, situacao=StatusTarefa.ABERTA):
        return Tarefa.objects.create(servico=servico, responsavel=self.tecnico, status=situacao)

    def get(self, nome, usuario=None, args=None, **params):
        self.client.force_authenticate(user=usuario or self.financeiro)
        return self.client.get(reverse(nome, args=args), params)

    def verificacao(self, dados, codigo):
        return next(v for v in dados['verificacoes'] if v['codigo'] == codigo)


class TarefaCanceladaTestCase(ConferenciaBase):
    def test_tarefa_cancelada_nao_impede_o_servico_de_concluir_e_a_os_de_liberar(self):
        ordem = self.venda()
        servico = self.servico(ordem)
        self.tarefa(servico, StatusTarefa.CONCLUIDA)
        self.tarefa(servico, StatusTarefa.CANCELADA)

        servico.refresh_from_db()
        ordem.refresh_from_db()
        self.assertEqual(servico.status, StatusServico.CONCLUIDA)
        self.assertEqual(servico.terminado_por, self.tecnico)
        self.assertTrue(ordem.liberada_para_cobranca)

    def test_servico_so_com_tarefas_canceladas_fica_aberto(self):
        servico = self.servico(self.venda())
        self.tarefa(servico, StatusTarefa.CANCELADA)

        servico.refresh_from_db()
        self.assertEqual(servico.status, StatusServico.ABERTO)

    def test_tarefa_em_andamento_com_outra_cancelada_fica_em_andamento(self):
        servico = self.servico(self.venda())
        self.tarefa(servico, StatusTarefa.EM_ANDAMENTO)
        self.tarefa(servico, StatusTarefa.CANCELADA)

        servico.refresh_from_db()
        self.assertEqual(servico.status, StatusServico.EM_ANDAMENTO)


class CobrancasTodasTestCase(ConferenciaBase):
    def setUp(self):
        super().setUp()
        self.a_faturar = self.venda(liberar_em=LiberarEm.VENDA)
        self.faturada = self.venda(liberar_em=LiberarEm.VENDA)
        self.faturada.registrar_lancamento('NF 1', self.hoje - timedelta(days=40), por=self.financeiro)
        self.previsao = self.venda(vencimento_dias_apos_nota=21)
        # Os dois serviços antes de concluir: com um só, a OS concluiria e seria liberada.
        feito = self.servico(self.previsao)
        self.falta = self.servico(self.previsao, self.pcmso)
        self.tarefa(feito, StatusTarefa.CONCLUIDA)
        self.tarefa(self.falta, StatusTarefa.EM_ANDAMENTO)

    def test_todas_traz_as_tres_situacoes_na_ordem_da_tela(self):
        dados = self.get('financeiro-cobrancas', situacao='todas').data

        self.assertEqual(
            [(linha['ordem_servico_id'], linha['situacao']) for linha in dados['ordens']],
            [(self.a_faturar.id, 'a_faturar'), (self.faturada.id, 'faturadas'), (self.previsao.id, 'previsao')],
        )
        self.assertEqual(dados['dias_alerta_sem_lancamento'], 3)

    def test_previsao_diz_o_que_falta_e_com_quem(self):
        linha = self.get('financeiro-cobrancas', situacao='previsao').data['ordens'][0]

        self.assertEqual(linha['vencimento_resumo'], '21 dias após a nota')
        self.assertEqual(len(linha['pendentes']), 1)
        pendente = linha['pendentes'][0]
        self.assertEqual(pendente['servico_id'], self.falta.id)
        self.assertEqual(pendente['servico_nome'], 'PCMSO')
        self.assertEqual(pendente['etapa'], 'em_execucao')
        self.assertEqual(pendente['responsaveis'], ['Técnico Executor'])

    def test_faturadas_limitadas_pela_data_do_lancamento(self):
        de = (self.hoje - timedelta(days=10)).isoformat()
        dados = self.get('financeiro-cobrancas', situacao='todas', faturada_de=de).data

        self.assertNotIn(self.faturada.id, [linha['ordem_servico_id'] for linha in dados['ordens']])
        self.assertEqual(dados['contadores']['faturadas']['quantidade'], 0)
        self.assertEqual(dados['contadores']['a_faturar']['quantidade'], 1)


class ResumoParaFaturarTestCase(ConferenciaBase):
    def test_servicos_realizados_com_quem_executou_e_quem_finalizou(self):
        ordem = self.venda()
        servico = self.servico(ordem)
        self.tarefa(servico, StatusTarefa.CONCLUIDA)

        dados = self.get('financeiro-ordem', args=[ordem.id]).data

        realizado = dados['servicos'][0]
        self.assertEqual(realizado['catalogo_nome'], 'PGR')
        self.assertEqual(realizado['setor_nome'], setor_padrao().nome)
        self.assertEqual(realizado['terminado_por_nome'], 'Técnico Executor')
        self.assertEqual(realizado['responsaveis'][0]['nome'], 'Técnico Executor')
        self.assertEqual(realizado['data_termino'], self.hoje.isoformat())
        self.assertEqual(dados['situacao'], 'a_faturar')
        self.assertEqual(dados['cliente']['nome'], 'Cliente Conferência')
        self.assertEqual(dados['cliente']['tipo_inscricao_display'], 'CNPJ')
        tipos = {evento['tipo']: evento['categoria'] for evento in dados['eventos']}
        self.assertEqual(tipos['liberacao'], 'financeiro')
        self.assertEqual(tipos['distribuicao'], 'execucao')

    def test_pendencias_da_os(self):
        ordem = self.venda(liberar_em=LiberarEm.VENDA)
        OrdemServico.objects.filter(pk=ordem.pk).update(liberada_para_cobranca_em=timezone.now() - timedelta(days=5))

        dados = self.get('financeiro-ordem', args=[ordem.id]).data

        self.assertEqual(dados['pendencias'], ['aguardando_lancamento'])
        self.assertEqual(dados['detalhe_pendencias'][0]['detalhe'], 'Liberada há 5 dias')


class ConferenciaTestCase(ConferenciaBase):
    def conferencia(self, usuario=None):
        return self.get('financeiro-conferencia', usuario)

    def test_garantias_em_zero_com_os_dados_em_dia(self):
        ordem = self.venda()
        self.tarefa(self.servico(ordem), StatusTarefa.CONCLUIDA)

        dados = self.conferencia().data

        for verificacao in dados['verificacoes']:
            if verificacao['tipo'] == 'garantia':
                self.assertEqual(verificacao['quantidade'], 0, verificacao['codigo'])

    def test_dado_fora_de_sincronia_aparece_e_corrigir_resolve(self):
        ordem = self.venda()
        servico = self.servico(ordem)
        tarefa = self.tarefa(servico)
        # Uma atualização em massa que pula o save(): a tarefa conclui, mas o serviço e a OS não sabem.
        Tarefa.objects.filter(pk=tarefa.pk).update(status=StatusTarefa.CONCLUIDA, data_termino=self.hoje)

        dados = self.conferencia().data
        item = self.verificacao(dados, 'sync_servico')['itens'][0]
        self.assertEqual(item['servico_id'], servico.id)

        self.client.force_authenticate(user=self.financeiro)
        resultado = self.client.post(reverse('financeiro-conferencia-corrigir')).data

        self.assertEqual(resultado, {'servicos_corrigidos': 1, 'ordens_liberadas': 1, 'operacionais_liberadas': 0})
        ordem.refresh_from_db()
        self.assertTrue(ordem.liberada_para_cobranca)
        self.assertEqual(self.verificacao(self.conferencia().data, 'sync_servico')['quantidade'], 0)

    def test_sem_distribuir_e_concluido_com_a_os_parada(self):
        ordem = self.venda()
        feito = self.servico(ordem)
        parado = self.servico(ordem, self.pcmso)
        self.tarefa(feito, StatusTarefa.CONCLUIDA)
        Servico.objects.filter(pk=feito.pk).update(data_termino=self.hoje - timedelta(days=20))
        Servico.objects.filter(pk=parado.pk).update(
            criado_em=timezone.now() - timedelta(days=10), ultima_movimentacao_em=timezone.now() - timedelta(days=10),
        )

        dados = self.conferencia().data

        sem_distribuir = self.verificacao(dados, 'sem_distribuir')['itens']
        self.assertEqual([(i['ordem_servico_id'], i['servico_nome']) for i in sem_distribuir], [(ordem.id, 'PCMSO')])
        parada = self.verificacao(dados, 'concluido_os_parada')['itens'][0]
        self.assertEqual(parada['servico_id'], parado.id)

    def test_vencimento_chegando(self):
        ordem = self.venda(data_acordada_cobranca=self.hoje + timedelta(days=2))
        self.servico(ordem)

        itens = self.verificacao(self.conferencia().data, 'vencimento_chegando')['itens']

        self.assertEqual(itens[0]['ordem_servico_id'], ordem.id)
        self.assertIn('vence em 2 dias', itens[0]['detalhe'])

    def test_servico_acrescentado_depois_da_liberacao(self):
        ordem = self.venda(liberar_em=LiberarEm.VENDA)
        ontem = timezone.now() - timedelta(days=1)
        OrdemServico.objects.filter(pk=ordem.pk).update(liberada_para_cobranca_em=ontem)
        RegistroAuditoria.objects.filter(ordem_servico_id=ordem.pk).update(criado_em=ontem)

        self.servico(ordem)

        itens = self.verificacao(self.conferencia().data, 'mudou_apos_liberacao')['itens']
        self.assertEqual(itens[0]['ordem_servico_id'], ordem.id)
        self.assertIn('Serviço acrescentado (PGR)', itens[0]['detalhe'])

    def test_criacao_com_os_servicos_nao_conta_como_mudanca(self):
        ordem = self.venda(liberar_em=LiberarEm.VENDA)
        self.servico(ordem)

        self.assertEqual(self.verificacao(self.conferencia().data, 'mudou_apos_liberacao')['quantidade'], 0)

    def test_valor_alterado_depois_de_faturada(self):
        ordem = self.venda(liberar_em=LiberarEm.VENDA)
        ordem.registrar_lancamento('NF 9', self.hoje, por=self.financeiro)
        RegistroAuditoria.objects.filter(ordem_servico_id=ordem.pk).update(criado_em=timezone.now() - timedelta(days=1))

        ordem.valor = Decimal('1500.00')
        ordem.save()

        itens = self.verificacao(self.conferencia().data, 'mudou_apos_lancamento')['itens']
        self.assertEqual(itens[0]['ordem_servico_id'], ordem.id)

    def test_so_o_financeiro_com_valores(self):
        self.assertEqual(self.conferencia(self.tecnico).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.conferencia(self.comercial).status_code, status.HTTP_403_FORBIDDEN)

    def test_comando(self):
        saida = StringIO()
        call_command('conferir_faturamento', stdout=saida)

        self.assertIn('[OK] Toda OS com os serviços concluídos está liberada: 0', saida.getvalue())
