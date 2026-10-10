from django.core.management.base import BaseCommand
from django.db import connections, transaction
from django.utils import timezone
from datetime import datetime, time

from apps.clientes.models import Cliente
from apps.contas.models import Usuario
from apps.ordem_servico.models import OrdemServico
from apps.servicos.models import Repositorio, Servico
from apps.tarefas.models import MiniOS, RepositorioMiniOS, Tarefa
from legado.ordemServico.models import (
    Cliente as LegadoCliente,
)
from legado.ordemServico.models import (
    MiniOS as LegadoMiniOS,
)
from legado.ordemServico.models import (
    OrdemServico as LegadoOrdemServico,
)
from legado.ordemServico.models import (
    Profile as LegadoProfile,
)
from legado.ordemServico.models import (
    Repositorio as LegadoRepositorio,
)
from legado.ordemServico.models import (
    RepositorioMiniOS as LegadoRepositorioMiniOS,
)
from legado.ordemServico.models import (
    Servico as LegadoServico,
)
from legado.ordemServico.models import (
    Tarefa as LegadoTarefa,
)

NOVO_DB = 'ergoapp_v3'


def _make_aware(dt):
    """Converte datetime naive para aware usando o timezone do projeto. Retorna None se dt for None."""
    if dt is None:
        return None
    if timezone.is_aware(dt):
        return dt
    return timezone.make_aware(dt)


def _date_to_aware(value):
    if value is None:
        return None
    return timezone.make_aware(datetime.combine(value, time.min))

ROLE_MAP = {
    1: 'diretor',
    2: 'administrativo',
    3: 'gestor_tecnico',
    4: 'sub_gestor_tecnico',
    5: 'tecnico',
    6: 'gestor_comercial',
}

FORMA_PAGAMENTO_MAP = {
    'debto': 'debito',
    'check': 'cheque',
}

SERVICO_STATUS_MAP = {
    'em_espera': 'aberto',
}

TAREFA_STATUS_MAP = {
    'nao_iniciada': 'aberta',
}


def _sim_nao(value, default=False):
    if value == 'sim':
        return True
    if value == 'nao':
        return False
    return default


def _reset_auto_increment(db, table, last_id):
    with connections[db].cursor() as cursor:
        cursor.execute(f'ALTER TABLE {table} AUTO_INCREMENT = %s', [last_id + 1])


class Command(BaseCommand):
    help = 'Migra dados do banco legado (ergogroup) para o novo banco (ergogroup_migracao)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Exibe contagens sem persistir dados',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN — nenhum dado será gravado ===\n'))

        steps = [
            ('Repositórios',        self._migrar_repositorios),
            ('Repositórios Mini OS', self._migrar_repositorios_mini_os),
            ('Clientes',            self._migrar_clientes),
            ('Usuários',            self._migrar_usuarios),
            ('Ordens de Serviço',   self._migrar_ordens_servico),
            ('Serviços',            self._migrar_servicos),
            ('Tarefas',             self._migrar_tarefas),
            ('Mini OS',             self._migrar_mini_os),
        ]

        for label, fn in steps:
            self.stdout.write(f'→ {label}...')
            try:
                count, warnings = fn(dry_run)
                self.stdout.write(self.style.SUCCESS(f'  ✓ {count} registro(s)'))
                for w in warnings:
                    self.stdout.write(self.style.WARNING(f'  ! {w}'))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  ✗ {exc}'))
                raise

        self.stdout.write(self.style.SUCCESS('\nMigração concluída.'))

    # ------------------------------------------------------------------

    def _migrar_repositorios(self, dry_run):
        objs = [
            Repositorio(id=r.id, nome=r.nome, descricao=r.descricao)
            for r in LegadoRepositorio.objects.using('default').all()
        ]
        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                Repositorio.objects.using(NOVO_DB).all().delete()
                Repositorio.objects.using(NOVO_DB).bulk_create(objs)
                _reset_auto_increment(NOVO_DB, 'servicos_repositorio', max(o.id for o in objs))
        return len(objs), []

    def _migrar_repositorios_mini_os(self, dry_run):
        objs = [
            RepositorioMiniOS(id=r.id, nome=r.nome, descricao=r.descricao)
            for r in LegadoRepositorioMiniOS.objects.using('default').all()
        ]
        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                RepositorioMiniOS.objects.using(NOVO_DB).all().delete()
                RepositorioMiniOS.objects.using(NOVO_DB).bulk_create(objs)
                _reset_auto_increment(NOVO_DB, 'tarefas_repositoriominios', max(o.id for o in objs))
        return len(objs), []

    def _migrar_clientes(self, dry_run):
        objs = []
        for c in LegadoCliente.objects.using('default').all():
            objs.append(Cliente(
                id=c.id,
                nome=c.nome,
                tipo_inscricao=c.tipo_inscricao,
                numero_inscricao=c.numero_inscricao,
                tipo_cliente=c.tipo_cliente,
                observacao=c.observacao,
                nome_representante=c.nome_representante,
                setor_representante=c.setor_representante,
                email_representante=c.email_representante,
                contato_representante=c.contato_representante,
                cobranca_revisao_alteracao=c.cobranca_revisao_alteracao,
                ativo=_sim_nao(c.cliente_ativo, default=True),
                # data_criacao preservada abaixo via update (campo auto_now_add)
            ))

        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                Cliente.objects.using(NOVO_DB).all().delete()
                Cliente.objects.using(NOVO_DB).bulk_create(objs)
                # bulk_create bypassa pre_save, mas auto_now_add pode ter sido aplicado;
                # forçamos a data original via update direto.
                for c in LegadoCliente.objects.using('default').only('id', 'data_criacao'):
                    Cliente.objects.using(NOVO_DB).filter(id=c.id).update(data_criacao=c.data_criacao)
                _reset_auto_increment(NOVO_DB, 'clientes_cliente', max(o.id for o in objs))
        return len(objs), []

    def _legado_users(self):
        """Lê auth_user do banco legado via SQL raw (evita o bloqueio do swapped model)."""
        with connections['default'].cursor() as cursor:
            cursor.execute(
                'SELECT id, username, email, password, first_name, last_name, '
                'is_superuser, is_staff, is_active, date_joined, last_login '
                'FROM auth_user'
            )
            cols = [c[0] for c in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]

    def _migrar_usuarios(self, dry_run):
        profiles = {
            p.user_id: p
            for p in LegadoProfile.objects.using('default').only('id', 'user_id', 'role', 'active')
        }

        objs = []
        warnings = []
        emails_vistos = set()

        for user in self._legado_users():
            profile = profiles.get(user['id'])
            tipo = ROLE_MAP.get(profile.role, 'administrativo') if profile else 'administrativo'
            ativo = profile.active if profile else True
            nome_completo = f"{user['first_name']} {user['last_name']}".strip() or user['username']

            email = user['email'] or ''
            if not email:
                email = f"{user['username']}@ergogroup.com.br"
                warnings.append(f"Usuário \"{user['username']}\" sem e-mail — usando {email}")

            # Resolve duplicatas de e-mail do legado (auth.User não exigia unicidade)
            if email in emails_vistos:
                email_original = email
                email = f"{user['id']}.{email}"
                warnings.append(
                    f"Usuário \"{user['username']}\" com e-mail duplicado \"{email_original}\" — "
                    f"renomeado para \"{email}\""
                )
            emails_vistos.add(email)

            if not profile:
                warnings.append(f"Usuário \"{user['username']}\" sem Profile — tipo padrão: administrativo")

            objs.append(Usuario(
                id=user['id'],
                username=user['username'],
                email=email,
                password=user['password'],
                first_name=user['first_name'],
                last_name=user['last_name'],
                is_superuser=user['is_superuser'],
                is_staff=user['is_staff'],
                is_active=user['is_active'],
                date_joined=_make_aware(user['date_joined']),
                last_login=_make_aware(user['last_login']),
                nome_completo=nome_completo,
                tipo_usuario=tipo,
                ativo=ativo,
            ))

        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                Usuario.objects.using(NOVO_DB).all().delete()
                Usuario.objects.using(NOVO_DB).bulk_create(objs)
                _reset_auto_increment(NOVO_DB, 'contas_usuario', max(o.id for o in objs))
        return len(objs), warnings

    def _migrar_ordens_servico(self, dry_run):
        username_to_id = {u['username']: u['id'] for u in self._legado_users()}

        objs = []
        warnings = []

        for os in LegadoOrdemServico.objects.using('default').all():
            forma = FORMA_PAGAMENTO_MAP.get(os.forma_pagamento, os.forma_pagamento)

            criado_por_id = None
            if os.usuario_criador:
                criado_por_id = username_to_id.get(os.usuario_criador.strip())
                if criado_por_id is None:
                    warnings.append(
                        f'OS #{os.id}: usuario_criador "{os.usuario_criador}" não encontrado — criado_por ficará nulo'
                    )

            objs.append(OrdemServico(
                id=os.id,
                cliente_id=os.cliente_id,
                criado_por_id=criado_por_id,
                data_criacao=os.data_criacao,
                criada_em=_date_to_aware(os.data_criacao) or timezone.now(),
                valor=os.valor or 0,
                forma_pagamento=forma,
                quantidade_parcelas=os.quantidade_parcelas,
                cobranca_imediata=_sim_nao(os.cobranca_imediata),
                nome_contato_envio_nf=os.nome_contato_envio_nf or '',
                contato_envio_nf=os.contato_envio_nf or '',
                observacao=os.observacao,
                concluida=_sim_nao(os.concluida),
                status='concluida' if _sim_nao(os.concluida) else 'aberta',
                prioridade='baixa',
                liberada_para_faturamento=_sim_nao(os.cobranca_imediata),
                liberada_para_faturamento_em=(
                    _date_to_aware(os.data_criacao) if _sim_nao(os.cobranca_imediata) else None
                ),
                liberada_para_faturamento_por_id=(
                    criado_por_id if _sim_nao(os.cobranca_imediata) else None
                ),
                faturada=_sim_nao(os.faturamento),
                numero_nf=os.numero_nf,
                data_faturamento=os.data_faturamento,
                faturada_por_id=3 if _sim_nao(os.faturamento) else None,
                # data_atualizacao é auto_now — será definida no update abaixo
            ))

        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                OrdemServico.objects.using(NOVO_DB).all().delete()
                # update_fields ignora auto_now durante bulk; forçamos timezone.now()
                for o in objs:
                    o.data_atualizacao = timezone.now()
                OrdemServico.objects.using(NOVO_DB).bulk_create(objs)
                _reset_auto_increment(NOVO_DB, 'ordem_servico_ordemservico', max(o.id for o in objs))
        return len(objs), warnings

    def _migrar_servicos(self, dry_run):
        objs = [
            Servico(
                id=s.id,
                ordem_servico_id=s.ordem_servico_id,
                repositorio_id=s.repositorio_id,
                descricao=s.descricao,
                status=SERVICO_STATUS_MAP.get(s.status, s.status or 'aberto'),
                data_termino=s.data_conclusao,
                data_conclusao=s.data_conclusao,
                criado_em=_date_to_aware(s.data_conclusao) or timezone.now(),
                atualizado_em=timezone.now(),
            )
            for s in LegadoServico.objects.using('default').all()
        ]
        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                Servico.objects.using(NOVO_DB).all().delete()
                Servico.objects.using(NOVO_DB).bulk_create(objs)
                _reset_auto_increment(NOVO_DB, 'servicos_servico', max(o.id for o in objs))
        return len(objs), []

    def _migrar_tarefas(self, dry_run):
        profile_to_user = {
            p.id: p.user_id
            for p in LegadoProfile.objects.using('default').only('id', 'user_id')
        }

        objs = []
        skipped = []

        for t in LegadoTarefa.objects.using('default').all():
            responsavel_id = profile_to_user.get(t.profile_id)
            if not responsavel_id:
                skipped.append(t.id)
                continue

            objs.append(Tarefa(
                id=t.id,
                servico_id=t.servico_id,
                responsavel_id=responsavel_id,
                descricao=t.descricao,
                data_inicio=t.data_inicio,
                data_termino=t.data_termino,
                status=TAREFA_STATUS_MAP.get(t.status, t.status or 'aberta'),
                criada_em=(
                    _date_to_aware(t.data_inicio)
                    or _date_to_aware(t.data_termino)
                    or timezone.now()
                ),
            ))

        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                Tarefa.objects.using(NOVO_DB).all().delete()
                Tarefa.objects.using(NOVO_DB).bulk_create(objs)
                # Preserva updated_at original via update (bypassa auto_now)
                for t in LegadoTarefa.objects.using('default').only('id', 'updated_at'):
                    Tarefa.objects.using(NOVO_DB).filter(id=t.id).update(atualizado_em=t.updated_at)
                _reset_auto_increment(NOVO_DB, 'tarefas_tarefa', max(o.id for o in objs))

        warnings = [f'{len(skipped)} tarefa(s) ignorada(s) por Profile inválido: IDs {skipped}'] if skipped else []
        return len(objs), warnings

    def _migrar_mini_os(self, dry_run):
        profile_to_user = {
            p.id: p.user_id
            for p in LegadoProfile.objects.using('default').only('id', 'user_id')
        }

        objs = []
        skipped = []

        for m in LegadoMiniOS.objects.using('default').all():
            responsavel_id = profile_to_user.get(m.profile_id)
            if not responsavel_id:
                skipped.append(m.id)
                continue

            revisao_cliente = m.revisao_cliente or False
            faturada = _sim_nao(m.faturamento)
            data_liberacao_cobranca = (
                _date_to_aware(m.data_termino)
                if revisao_cliente and m.status == 'finalizada'
                else None
            )

            objs.append(MiniOS(
                id=m.id,
                cliente_id=m.cliente_id,
                servico_id=m.servico_id,
                responsavel_id=responsavel_id,
                quantidade=m.quantidade or 1,
                descricao=m.descricao,
                data_recebimento=m.data_recebimento,
                data_inicio=m.data_inicio,
                data_termino=m.data_termino,
                status=m.status or 'nao_iniciado',
                criada_em=(
                    _date_to_aware(m.data_recebimento)
                    or _date_to_aware(m.data_inicio)
                    or _date_to_aware(m.data_termino)
                    or timezone.now()
                ),
                atualizado_em=timezone.now(),
                revisao_cliente=revisao_cliente,
                gera_cobranca=revisao_cliente,
                data_liberacao_cobranca=data_liberacao_cobranca,
                liberada_cobranca_por_id=responsavel_id if data_liberacao_cobranca else None,
                faturada=faturada,
                numero_nf=m.n_nf,
                faturada_por_id=3 if faturada else None,
            ))

        if not dry_run and objs:
            with transaction.atomic(using=NOVO_DB):
                MiniOS.objects.using(NOVO_DB).all().delete()
                MiniOS.objects.using(NOVO_DB).bulk_create(objs)
                _reset_auto_increment(NOVO_DB, 'tarefas_minios', max(o.id for o in objs))

        warnings = [f'{len(skipped)} Mini OS ignorado(s) por Profile inválido: IDs {skipped}'] if skipped else []
        return len(objs), warnings
