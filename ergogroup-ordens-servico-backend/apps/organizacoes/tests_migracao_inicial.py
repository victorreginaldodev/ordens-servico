import importlib

from django.test import TestCase
from django.utils import timezone

from apps.catalogo.models import Catalogo
from apps.clientes.models import Cliente
from apps.ordens_servico.models import OrdemServico, Servico
from apps.organizacoes.apoio_testes import SETOR_E_FUNCAO, Perfil, criar_usuario
from apps.organizacoes.models import Funcao, Setor
from apps.organizacoes.permissoes import Permissao, tem_permissao

migracao = importlib.import_module('apps.organizacoes.migrations.0013_cria_setores_funcoes_e_vinculos_iniciais')


class MigracaoInicialTestCase(TestCase):
    def test_cria_os_cinco_setores(self):
        self.assertEqual(
            set(Setor.objects.values_list('nome', flat=True)),
            {'Diretoria', 'Comercial', 'Segurança do Trabalho', 'Financeiro', 'Administrativo'},
        )

    def test_cria_as_funcoes_com_as_permissoes_do_mapeamento(self):
        # Ajustes posteriores ao mapeamento: "Recebe tarefas" nas funções de Segurança do Trabalho (0021) e o
        # Gestor Técnico sem "Ver valores" (0022), decisões da revisão de permissões de 14/10/2026,
        # "Configurar a cobrança do catálogo operacional" no Diretor (0023) e "Gerenciar o catálogo
        # operacional" para quem gerenciava a OS operacional (0025).
        for nome_setor, nome_funcao, permissoes in migracao.MAPEAMENTO.values():
            esperadas = set(permissoes)
            if nome_setor == 'Segurança do Trabalho':
                esperadas.add('tarefas.receber')
            if nome_funcao == 'Gestor Técnico':
                esperadas.discard('financeiro.ver_valores')
            if nome_funcao == 'Diretor':
                # 0023: a regra de cobrança do catálogo operacional começa só com a diretoria.
                esperadas.add('catalogo_operacional.configurar_cobranca')
            if 'os_operacional.gerenciar' in esperadas:
                # 0025 (19/10/2026): o catálogo operacional ganhou permissão própria.
                esperadas.add('catalogo_operacional.gerenciar')
            funcao = Funcao.objects.get(nome=nome_funcao)
            self.assertEqual(set(funcao.codigos_permissao), esperadas, nome_funcao)

    def test_perfis_de_teste_seguem_o_mapeamento_da_migracao(self):
        for tipo, (nome_setor, nome_funcao, _) in migracao.MAPEAMENTO.items():
            self.assertEqual(SETOR_E_FUNCAO[tipo], (nome_setor, nome_funcao))


class DiretoriaAtuaEmTodosOsSetoresTestCase(TestCase):
    def setUp(self):
        self.diretor = criar_usuario(Perfil.DIRETOR)
        self.gestor_tecnico = criar_usuario(Perfil.GESTOR_TECNICO)
        self.seguranca = Setor.objects.get(nome='Segurança do Trabalho')
        self.servico = Servico.objects.create(
            ordem_servico=OrdemServico.objects.create(
                cliente=Cliente.objects.create(nome='Cliente'), data_venda=timezone.localdate(), valor=0,
            ),
            descricao='PGR', catalogo=Catalogo.objects.create(nome='PGR', setor=self.seguranca),
        )

    def test_diretor_distribui_tarefas_num_setor_em_que_nao_tem_vinculo(self):
        self.assertTrue(tem_permissao(self.diretor, Permissao.TAREFAS_DISTRIBUIR, self.servico.setor_id))

    def test_gestor_tecnico_distribui_so_em_seguranca_do_trabalho(self):
        comercial = Setor.objects.get(nome='Comercial')

        self.assertTrue(tem_permissao(self.gestor_tecnico, Permissao.TAREFAS_DISTRIBUIR, self.seguranca))
        self.assertFalse(tem_permissao(self.gestor_tecnico, Permissao.TAREFAS_DISTRIBUIR, comercial))
