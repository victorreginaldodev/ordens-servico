from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.contas.models import Usuario
from apps.organizacoes.apoio_testes import Perfil, criar_usuario_com_perfil, setor_padrao
from apps.ordens_servico.models import OrdemServico, Prioridade
from apps.ordens_servico.models import Servico
from apps.catalogo.models.catalogo import Catalogo, Complexidade
from apps.ordens_servico.models.servico import StatusServico
from apps.ordens_servico.models import Tarefa, OrdemServicoOperacional
from apps.catalogo.models import CatalogoOperacional
from apps.ordens_servico.models.tarefa import StatusTarefa
from apps.ordens_servico.models.ordem_servico_operacional import StatusOrdemServicoOperacional


PERFIS_SEM_VALORES = [
    Perfil.SUB_GESTOR_TECNICO,
    Perfil.TECNICO,
    Perfil.GESTOR_ADMINISTRATIVO,
    Perfil.ADMINISTRATIVO,
]


class AnaliseTestCase(APITestCase):
    def setUp(self):
        self.hoje = timezone.localdate()

        self.usuarios = {
            tipo: criar_usuario_com_perfil(
                username=f'usuario_{tipo}',
                email=f'{tipo}@ergogroup.test',
                password='senha-teste-123',
                nome_completo=f'Usuario {tipo}',
                perfil=tipo,
            )
            for tipo in Perfil.values
        }
        self.tecnico = self.usuarios[Perfil.TECNICO]
        self.outro_tecnico = criar_usuario_com_perfil(
            username='outro_tecnico',
            email='outro_tecnico@ergogroup.test',
            password='senha-teste-123',
            nome_completo='Outro Tecnico',
            perfil=Perfil.TECNICO,
        )

        self.cliente = Cliente.objects.create(nome='Cliente Financeiro')
        self.cliente_secundario = Cliente.objects.create(nome='Cliente Secundario')

        # OS financeiras "soltas" (sem servicos/tarefas), para testar somas e redação de valores.
        self.os_cobranca_realizada = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=self.hoje, valor=1000,
            cobranca_realizada=True, liberada_para_cobranca=True,
        )
        self.os_liberada = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=self.hoje, valor=500,
            cobranca_realizada=False, liberada_para_cobranca=True,
        )
        self.os_sem_liberacao = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=self.hoje, valor=300,
            cobranca_realizada=False, liberada_para_cobranca=False,
        )

        # Cadeia OS -> Servico -> Tarefa para indicadores de produtividade/tempo.
        self.catalogo = Catalogo.objects.create(setor=setor_padrao(), nome='Catalogo Teste')
        self.os_chain = OrdemServico.objects.create(
            cliente=self.cliente,
            data_venda=self.hoje - timedelta(days=5),
            valor=0,
        )
        self.servico_chain = Servico.objects.create(
            ordem_servico=self.os_chain,
            catalogo=self.catalogo,
            descricao='Servico de teste',
        )
        self.tarefa_chain = Tarefa.objects.create(
            servico=self.servico_chain,
            responsavel=self.tecnico,
            descricao='Tarefa de teste',
            status=StatusTarefa.CONCLUIDA,
        )
        # Backdata o início (e a criação, para não afetar o tempo de resposta)
        # da tarefa para gerar uma duração mensurável, e repropaga a
        # sincronização (data_termino é mantida pelo proprio fluxo).
        Tarefa.objects.filter(pk=self.tarefa_chain.pk).update(
            data_inicio=self.hoje - timedelta(days=3),
            criada_em=timezone.now() - timedelta(days=3),
        )
        self.servico_chain.refresh_from_db()
        self.servico_chain.sincronizar_status_e_rastreio()

        # Segunda cadeia, para validar que um técnico só vê a própria linha.
        self.os_chain_outro = OrdemServico.objects.create(
            cliente=self.cliente, data_venda=self.hoje, valor=0,
        )
        self.servico_chain_outro = Servico.objects.create(
            ordem_servico=self.os_chain_outro,
            catalogo=self.catalogo,
            descricao='Servico de outro tecnico',
        )
        Tarefa.objects.create(
            servico=self.servico_chain_outro,
            responsavel=self.outro_tecnico,
            descricao='Tarefa de outro tecnico',
            status=StatusTarefa.CONCLUIDA,
        )

        self.catalogo_operacional = CatalogoOperacional.objects.create(nome='Catalogo Operacional Teste')
        self.oso = OrdemServicoOperacional.objects.create(
            cliente=self.cliente,
            catalogo_operacional=self.catalogo_operacional,
            responsavel=self.tecnico,
            data_recebimento=self.hoje,
            data_inicio=self.hoje,
            data_termino=self.hoje,
            status=StatusOrdemServicoOperacional.FINALIZADA,
        )

        # Carga de trabalho atual (WIP) do tecnico: uma tarefa e uma OS operacional em andamento.
        os_wip = OrdemServico.objects.create(cliente=self.cliente, data_venda=self.hoje, valor=0)
        servico_wip = Servico.objects.create(
            ordem_servico=os_wip, catalogo=self.catalogo, descricao='Servico em andamento',
        )
        self.tarefa_wip = Tarefa.objects.create(
            servico=servico_wip, responsavel=self.tecnico,
            descricao='Tarefa em andamento', status=StatusTarefa.EM_ANDAMENTO,
            prazo=self.hoje - timedelta(days=1), prioridade=Prioridade.ALTA,
        )
        self.oso_wip = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.catalogo_operacional, responsavel=self.tecnico,
            data_recebimento=self.hoje, status=StatusOrdemServicoOperacional.EM_ANDAMENTO,
        )

        # Tarefa que esperou 4 dias antes de ser iniciada, para medir o tempo de resposta.
        os_lead_time = OrdemServico.objects.create(cliente=self.cliente, data_venda=self.hoje, valor=0)
        servico_lead_time = Servico.objects.create(
            ordem_servico=os_lead_time, catalogo=self.catalogo, descricao='Servico com espera',
        )
        self.tarefa_lead_time = Tarefa.objects.create(
            servico=servico_lead_time, responsavel=self.tecnico,
            descricao='Tarefa com espera', status=StatusTarefa.EM_ANDAMENTO,
            prazo=self.hoje + timedelta(days=5), prioridade=Prioridade.ALTA,
        )
        Tarefa.objects.filter(pk=self.tarefa_lead_time.pk).update(
            criada_em=timezone.now() - timedelta(days=4),
        )

        # Tarefa e servico cancelados, para a taxa de cancelamento.
        os_cancelamento = OrdemServico.objects.create(cliente=self.cliente, data_venda=self.hoje, valor=0)
        servico_tarefa_cancelada = Servico.objects.create(
            ordem_servico=os_cancelamento, catalogo=self.catalogo, descricao='Servico da tarefa cancelada',
        )
        self.tarefa_cancelada = Tarefa.objects.create(
            servico=servico_tarefa_cancelada, responsavel=self.tecnico,
            descricao='Tarefa cancelada', status=StatusTarefa.CANCELADA,
        )
        self.servico_cancelado = Servico.objects.create(
            ordem_servico=os_cancelamento, catalogo=self.catalogo,
            descricao='Servico cancelado', status=StatusServico.CANCELADO,
        )

        # --- Fixtures novas para o refactor financeiro/operacional ---

        # Segundo catalogo/catalogo operacional, para provar que os agrupamentos por
        # catalogo (percentual, tempo medio, cancelamento) realmente discriminam grupos.
        self.catalogo_secundario = Catalogo.objects.create(setor=setor_padrao(), nome='Catalogo Secundario')
        self.catalogo_operacional_secundario = CatalogoOperacional.objects.create(
            nome='Catalogo Operacional Secundario', horas_estimadas=Decimal('1.00'), complexidade=Complexidade.BAIXA,
        )

        os_secundario = OrdemServico.objects.create(cliente=self.cliente, data_venda=self.hoje, valor=0)
        self.servico_secundario_concluido = Servico.objects.create(
            ordem_servico=os_secundario, catalogo=self.catalogo_secundario,
            descricao='Servico catalogo secundario', status=StatusServico.CONCLUIDA,
        )
        Servico.objects.filter(pk=self.servico_secundario_concluido.pk).update(
            data_inicio=self.hoje - timedelta(days=1), data_termino=self.hoje,
        )
        self.servico_secundario_cancelado = Servico.objects.create(
            ordem_servico=os_secundario, catalogo=self.catalogo_secundario,
            descricao='Servico secundario cancelado', status=StatusServico.CANCELADO,
        )

        self.oso_secundario = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.catalogo_operacional_secundario,
            responsavel=self.outro_tecnico, data_recebimento=self.hoje,
            status=StatusOrdemServicoOperacional.FINALIZADA,
        )
        OrdemServicoOperacional.objects.filter(pk=self.oso_secundario.pk).update(
            data_inicio=self.hoje - timedelta(days=2),
            data_termino=self.hoje,
        )

        # Revisoes de cliente, para o percentual de "revisoes por cliente" (atribuidas
        # ao outro_tecnico para nao alterar a carga de trabalho ja testada do self.tecnico).
        self.oso_revisao_principal = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.catalogo_operacional, responsavel=self.outro_tecnico,
            data_recebimento=self.hoje, status=StatusOrdemServicoOperacional.NAO_INICIADO, revisao_cliente=True,
        )
        self.oso_revisao_secundario_1 = OrdemServicoOperacional.objects.create(
            cliente=self.cliente_secundario, catalogo_operacional=self.catalogo_operacional,
            responsavel=self.outro_tecnico, data_recebimento=self.hoje,
            status=StatusOrdemServicoOperacional.NAO_INICIADO, revisao_cliente=True,
        )
        self.oso_revisao_secundario_2 = OrdemServicoOperacional.objects.create(
            cliente=self.cliente_secundario, catalogo_operacional=self.catalogo_operacional,
            responsavel=self.outro_tecnico, data_recebimento=self.hoje,
            status=StatusOrdemServicoOperacional.NAO_INICIADO, revisao_cliente=True,
        )

        # Tarefas/OSO concluidas com prazo, para a taxa de cumprimento de prazo (historico).
        # Atribuidas ao outro_tecnico para isolar da carga de trabalho ja testada do self.tecnico.
        self.tarefa_no_prazo = Tarefa.objects.create(
            servico=self.servico_chain_outro, responsavel=self.outro_tecnico,
            descricao='Tarefa concluida no prazo', status=StatusTarefa.CONCLUIDA,
            prazo=self.hoje + timedelta(days=1),
        )
        self.tarefa_atrasada_concluida = Tarefa.objects.create(
            servico=self.servico_chain_outro, responsavel=self.outro_tecnico,
            descricao='Tarefa concluida atrasada', status=StatusTarefa.CONCLUIDA,
            prazo=self.hoje - timedelta(days=2),
        )
        self.oso_no_prazo = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.catalogo_operacional, responsavel=self.outro_tecnico,
            data_recebimento=self.hoje, status=StatusOrdemServicoOperacional.FINALIZADA,
            data_inicio=self.hoje, data_termino=self.hoje,
            prazo=self.hoje + timedelta(days=1),
        )
        self.oso_atrasado_concluido = OrdemServicoOperacional.objects.create(
            cliente=self.cliente, catalogo_operacional=self.catalogo_operacional, responsavel=self.outro_tecnico,
            data_recebimento=self.hoje, status=StatusOrdemServicoOperacional.FINALIZADA,
            data_inicio=self.hoje, data_termino=self.hoje,
            prazo=self.hoje - timedelta(days=2),
        )

    def _login(self, usuario):
        self.client.force_authenticate(user=usuario)
