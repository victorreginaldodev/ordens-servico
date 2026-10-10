from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico, Tarefa
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.organizacoes.apoio_testes import Perfil, criar_usuario, setor_padrao
from apps.organizacoes.models import Funcao, MembroSetor, Organizacao, Setor
from apps.organizacoes.permissoes import Permissao


class BlocosBase(APITestCase):
    """Segurança do Trabalho com um serviço em cada etapa, e Ergonomia, um setor novo com a própria gestora."""

    def setUp(self):
        self.hoje = timezone.localdate()
        self.seguranca = setor_padrao()
        self.gestor = criar_usuario(Perfil.GESTOR_TECNICO, nome_completo='Gestora Técnica')
        self.tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Um')
        self.outro_tecnico = criar_usuario(Perfil.TECNICO, nome_completo='Técnico Dois')
        self.comercial = criar_usuario(Perfil.COMERCIAL, nome_completo='Vendedora')
        self.diretor = criar_usuario(Perfil.DIRETOR)

        ergogroup = Organizacao.objects.get(nome='Ergogroup')
        self.ergonomia = Setor.objects.create(organizacao=ergogroup, nome='Ergonomia')
        coordenacao = Funcao.objects.create(organizacao=ergogroup, nome='Coordenação de Ergonomia')
        coordenacao.setores.add(self.ergonomia)
        coordenacao.definir_permissoes([Permissao.SERVICOS_VER_SETOR, Permissao.TAREFAS_DISTRIBUIR])
        self.coordenadora = criar_usuario(None, nome_completo='Coordenadora')
        MembroSetor.objects.create(usuario=self.coordenadora, setor=self.ergonomia, funcao=coordenacao)

        self.cliente = Cliente.objects.create(nome='Cliente Blocos')
        pgr = Catalogo.objects.create(nome='PGR', setor=self.seguranca)
        ltcat = Catalogo.objects.create(nome='LTCAT', setor=self.seguranca)
        aet = Catalogo.objects.create(nome='AET', setor=self.ergonomia)
        self.ordem = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=self.hoje, valor=9000, criado_por=self.comercial,
        )
        self.na_fila = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR', catalogo=pgr)
        self.distribuido = Servico.objects.create(ordem_servico=self.ordem, descricao='LTCAT', catalogo=ltcat)
        self.em_execucao = Servico.objects.create(ordem_servico=self.ordem, descricao='PGR filial', catalogo=pgr)
        self.concluido = Servico.objects.create(ordem_servico=self.ordem, descricao='LTCAT filial', catalogo=ltcat)
        self.da_ergonomia = Servico.objects.create(ordem_servico=self.ordem, descricao='AET', catalogo=aet)

        self.tarefa_distribuida = Tarefa.objects.create(
            servico=self.distribuido, responsavel=self.tecnico, prazo=self.hoje + timedelta(days=3),
        )
        self.tarefa_atrasada = Tarefa.objects.create(
            servico=self.em_execucao, responsavel=self.tecnico, prazo=self.hoje - timedelta(days=2),
            status=StatusTarefa.EM_ANDAMENTO,
        )
        Tarefa.objects.create(
            servico=self.concluido, responsavel=self.outro_tecnico, prazo=self.hoje + timedelta(days=1),
            status=StatusTarefa.CONCLUIDA,
        )

    def get(self, usuario, nome_rota, **params):
        self.client.force_authenticate(user=usuario)
        return self.client.get(reverse(nome_rota), params)

    def envelhecer(self, servico, dias):
        Servico.objects.filter(pk=servico.pk).update(ultima_movimentacao_em=timezone.now() - timedelta(days=dias))


class SetoresAcompanhadosTestCase(BlocosBase):
    def test_gestora_ve_o_proprio_setor_com_os_contadores(self):
        response = self.get(self.gestor, 'execucao-setores')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([setor['nome'] for setor in response.data], ['Segurança do Trabalho'])
        setor = response.data[0]
        self.assertTrue(setor['organiza'])
        self.assertEqual(
            (setor['na_fila'], setor['em_andamento'], setor['atrasados'], setor['sem_prazo']), (1, 2, 1, 0),
        )

    def test_diretoria_ve_todos_os_setores_de_execucao(self):
        response = self.get(self.diretor, 'execucao-setores')

        self.assertEqual({setor['nome'] for setor in response.data}, {'Segurança do Trabalho', 'Ergonomia'})

    def test_setor_novo_aparece_para_a_sua_coordenadora(self):
        response = self.get(self.coordenadora, 'execucao-setores')

        self.assertEqual([(setor['nome'], setor['na_fila']) for setor in response.data], [('Ergonomia', 1)])

    def test_quem_nao_acompanha_setor_recebe_403(self):
        for usuario in (self.comercial, self.tecnico):
            self.assertEqual(self.get(usuario, 'execucao-setores').status_code, status.HTTP_403_FORBIDDEN)


class FilaTestCase(BlocosBase):
    def test_fila_traz_o_que_nao_foi_distribuido_com_o_contexto_da_venda(self):
        response = self.get(self.gestor, 'execucao-fila', setor=self.seguranca.id)

        self.assertEqual([item['servico_id'] for item in response.data], [self.na_fila.id])
        item = response.data[0]
        self.assertEqual(item['cliente_nome'], 'Cliente Blocos')
        self.assertEqual(item['vendido_por_nome'], 'Vendedora')
        self.assertEqual(item['na_fila_ha_dias'], 0)
        outros = {outro['descricao']: outro for outro in item['outros_servicos_da_os']}
        self.assertEqual(outros['LTCAT']['etapa'], 'distribuido')
        self.assertEqual(outros['LTCAT']['responsaveis'], ['Técnico Um'])
        self.assertEqual(outros['AET']['setor_nome'], 'Ergonomia')
        self.assertNotIn('valor', item)

    def test_setor_e_obrigatorio_e_precisa_existir(self):
        self.assertEqual(self.get(self.gestor, 'execucao-fila').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.get(self.gestor, 'execucao-fila', setor=99999).status_code, status.HTTP_404_NOT_FOUND)

    def test_nao_acessa_a_fila_de_outro_setor(self):
        response = self.get(self.gestor, 'execucao-fila', setor=self.ergonomia.id)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_diretoria_acessa_a_fila_de_qualquer_setor(self):
        response = self.get(self.diretor, 'execucao-fila', setor=self.ergonomia.id)

        self.assertEqual([item['servico_id'] for item in response.data], [self.da_ergonomia.id])


class DistribuirTestCase(BlocosBase):
    def distribuir(self, usuario, servico, tarefas):
        self.client.force_authenticate(user=usuario)
        return self.client.post(
            reverse('execucao-distribuir', args=[servico.id]), {'tarefas': tarefas}, format='json',
        )

    def test_distribui_em_um_passo(self):
        prazo = (self.hoje + timedelta(days=10)).isoformat()

        response = self.distribuir(self.gestor, self.na_fila, [{'responsavel': self.tecnico.id, 'prazo': prazo}])

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['etapa'], 'distribuido')
        self.assertEqual(response.data['prazo'], prazo)
        self.assertEqual([tarefa['responsavel_nome'] for tarefa in response.data['tarefas']], ['Técnico Um'])

    def test_divide_entre_tecnicos(self):
        response = self.distribuir(self.gestor, self.na_fila, [
            {'responsavel': self.tecnico.id, 'descricao': 'Campo'},
            {'responsavel': self.outro_tecnico.id, 'descricao': 'Relatório'},
        ])

        self.assertEqual(len(response.data['tarefas']), 2)

    def test_responsavel_de_fora_do_setor_recusa_a_distribuicao_inteira(self):
        response = self.distribuir(self.gestor, self.na_fila, [
            {'responsavel': self.tecnico.id}, {'responsavel': self.comercial.id},
        ])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(self.na_fila.tarefas.exists())

    def test_quem_nao_distribui_no_setor_recebe_403(self):
        response = self.distribuir(self.coordenadora, self.na_fila, [{'responsavel': self.tecnico.id}])

        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
        self.assertEqual(
            self.distribuir(self.comercial, self.na_fila, [{'responsavel': self.tecnico.id}]).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_exige_ao_menos_uma_tarefa(self):
        self.assertEqual(self.distribuir(self.gestor, self.na_fila, []).status_code, status.HTTP_400_BAD_REQUEST)


class AndamentoTestCase(BlocosBase):
    def test_tarefas_ativas_do_setor_atrasadas_primeiro(self):
        response = self.get(self.gestor, 'execucao-andamento', setor=self.seguranca.id)

        self.assertEqual(
            [linha['tarefa_id'] for linha in response.data], [self.tarefa_atrasada.id, self.tarefa_distribuida.id],
        )
        self.assertEqual(response.data[0]['situacao_prazo'], 'atrasado')
        self.assertEqual(response.data[1]['situacao_prazo'], 'vence_7_dias')

    def test_filtra_por_responsavel(self):
        response = self.get(self.gestor, 'execucao-andamento', setor=self.seguranca.id, responsavel=self.outro_tecnico.id)

        self.assertEqual(response.data, [])


class AlertasECienciaTestCase(BlocosBase):
    def test_lista_atrasados_e_sem_movimentacao(self):
        self.envelhecer(self.distribuido, 10)

        response = self.get(self.gestor, 'execucao-alertas', setor=self.seguranca.id)

        motivos = {linha['servico_id']: linha['motivos'] for linha in response.data}
        self.assertEqual(motivos, {self.em_execucao.id: ['atrasado'], self.distribuido.id: ['sem_movimentacao']})
        self.assertEqual(response.data[0]['servico_id'], self.em_execucao.id)

    def test_responsavel_da_ciencia_e_o_alerta_some(self):
        self.envelhecer(self.distribuido, 10)
        self.client.force_authenticate(user=self.tecnico)

        response = self.client.post(
            reverse('execucao-ciencia', args=[self.distribuido.id]), {'motivo': 'cliente', 'observacao': 'Sem acesso'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['em_alerta'])
        self.assertEqual(response.data['alerta_ciente_por_nome'], 'Técnico Um')
        alertas = self.get(self.gestor, 'execucao-alertas', setor=self.seguranca.id).data
        self.assertNotIn(self.distribuido.id, [linha['servico_id'] for linha in alertas])

    def test_quem_nao_tem_tarefa_nem_acompanha_o_setor_nao_da_ciencia(self):
        self.client.force_authenticate(user=self.comercial)

        response = self.client.post(reverse('execucao-ciencia', args=[self.distribuido.id]), {})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_servico_concluido_nao_recebe_ciencia(self):
        self.client.force_authenticate(user=self.gestor)

        response = self.client.post(reverse('execucao-ciencia', args=[self.concluido.id]), {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ConcluidosTestCase(BlocosBase):
    def test_concluidos_no_mes_com_quem_concluiu(self):
        response = self.get(self.gestor, 'execucao-concluidos', setor=self.seguranca.id)

        self.assertEqual(len(response.data['servicos']), 1)
        linha = response.data['servicos'][0]
        self.assertEqual(linha['terminado_por_nome'], 'Técnico Dois')
        self.assertTrue(linha['no_prazo'])

    def test_periodo_sem_conclusoes(self):
        ontem = (self.hoje - timedelta(days=1)).isoformat()

        response = self.get(self.gestor, 'execucao-concluidos', setor=self.seguranca.id, de=ontem, ate=ontem)

        self.assertEqual(response.data['servicos'], [])

    def test_data_invalida(self):
        response = self.get(self.gestor, 'execucao-concluidos', setor=self.seguranca.id, de='10/10/2026')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EquipeTestCase(BlocosBase):
    def test_carga_por_membro(self):
        response = self.get(self.gestor, 'execucao-equipe', setor=self.seguranca.id)

        por_nome = {linha['nome']: linha for linha in response.data}
        self.assertEqual(set(por_nome), {'Gestora Técnica', 'Técnico Um', 'Técnico Dois'})
        tecnico = por_nome['Técnico Um']
        self.assertEqual((tecnico['ativos'], tecnico['atrasados'], tecnico['vence_7_dias']), (2, 1, 1))
        self.assertEqual(tecnico['funcao'], 'Técnico')
        self.assertEqual(por_nome['Técnico Dois']['ativos'], 0)

    def test_quem_tem_tarefa_no_setor_sem_ser_membro_aparece_separado(self):
        Tarefa.objects.create(servico=self.distribuido, responsavel=self.comercial)

        response = self.get(self.gestor, 'execucao-equipe', setor=self.seguranca.id)

        ultima = response.data[-1]
        self.assertEqual((ultima['nome'], ultima['membro_do_setor'], ultima['ativos']), ('Vendedora', False, 1))


class MeusServicosTestCase(BlocosBase):
    def test_tecnico_ve_o_que_esta_com_ele(self):
        response = self.get(self.tecnico, 'execucao-meus-servicos')

        self.assertEqual(
            [linha['tarefa_id'] for linha in response.data], [self.tarefa_atrasada.id, self.tarefa_distribuida.id],
        )

    def test_historico_de_concluidas(self):
        response = self.get(self.outro_tecnico, 'execucao-meus-servicos', status='concluida')

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'concluida')

    def test_quem_nao_tem_tarefas_recebe_lista_vazia(self):
        response = self.get(self.comercial, 'execucao-meus-servicos')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


class DetalheDoServicoTestCase(BlocosBase):
    def detalhe(self, usuario, servico):
        self.client.force_authenticate(user=usuario)
        return self.client.get(reverse('execucao-servico', args=[servico.id]))

    def test_tecnico_ve_o_servico_dele_sem_valores(self):
        response = self.detalhe(self.tecnico, self.distribuido)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['pode_distribuir'])
        self.assertTrue(response.data['pode_dar_ciencia'])
        self.assertEqual(response.data['ordem_servico']['cliente_nome'], 'Cliente Blocos')
        self.assertNotIn('valor', response.data['ordem_servico'])
        self.assertEqual(len(response.data['outros_servicos_da_os']), 4)

    def test_gestora_pode_distribuir(self):
        self.assertTrue(self.detalhe(self.gestor, self.na_fila).data['pode_distribuir'])

    def test_servico_que_a_pessoa_nao_ve_responde_404(self):
        response = self.detalhe(self.tecnico, self.na_fila)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
