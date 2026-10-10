import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def _tabela_existe(cursor, nome):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.tables "
        "WHERE table_schema = DATABASE() AND table_name = %s",
        [nome],
    )
    return cursor.fetchone()[0] > 0


def _migrar_ou_criar(schema_editor, tabela_antiga, tabela_nova, sql_criar, sql_extra=None):
    """Adota a tabela física existente (renomeando, sem copiar dados) se o
    schema antigo (pré-refactor ordem_servico/servicos/tarefas) ainda estiver
    presente; cria a tabela do zero (via SQL bruto — não dá pra usar
    apps.get_model aqui dentro: o `apps` recebido por um RunPython colocado
    em `database_operations` de um SeparateDatabaseAndState reflete o estado
    ANTES dos `state_operations` irmãos, então o model ainda não existe nele)
    se for um banco novo; não faz nada se já tiver sido migrado antes
    (idempotente). Não depende dos apps antigos existirem no INSTALLED_APPS —
    decide olhando o banco de verdade.
    """
    with schema_editor.connection.cursor() as cursor:
        if _tabela_existe(cursor, tabela_nova):
            return
        schema_antigo = _tabela_existe(cursor, tabela_antiga)

    if schema_antigo:
        schema_editor.execute(f"ALTER TABLE {tabela_antiga} RENAME TO {tabela_nova}")
        if sql_extra:
            schema_editor.execute(sql_extra)
    else:
        schema_editor.execute(sql_criar)


def _migrar_ordem_servico(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'ordem_servico_ordemservico', 'ordens_servico_ordemservico',
        sql_criar=(
            "CREATE TABLE ordens_servico_ordemservico ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "data_venda date NOT NULL, "
            "concluida tinyint(1) NOT NULL, "
            "status varchar(15) NOT NULL, "
            "prioridade varchar(10) NOT NULL, "
            "valor decimal(10,2) NOT NULL, "
            "forma_pagamento varchar(15) NOT NULL, "
            "quantidade_parcelas int NULL, "
            "cobranca_imediata tinyint(1) NOT NULL, "
            "data_acordada_cobranca date NULL, "
            "nome_contato_envio_nf varchar(50) NOT NULL, "
            "contato_envio_nf varchar(254) NOT NULL, "
            "observacao longtext NULL, "
            "contrato tinyint(1) NOT NULL, "
            "objeto_contrato varchar(255) NULL, "
            "contrato_data_inicio date NULL, "
            "contrato_data_fim date NULL, "
            "gestor_contrato_nome varchar(255) NULL, "
            "gestor_contrato_email varchar(254) NULL, "
            "gestor_contrato_telefone varchar(30) NULL, "
            "liberada_para_cobranca tinyint(1) NOT NULL, "
            "liberada_para_cobranca_em datetime(6) NULL, "
            "cobranca_realizada tinyint(1) NOT NULL, "
            "numero_nf int NULL, "
            "data_cobranca date NULL, "
            "criada_em datetime(6) NOT NULL, "
            "data_atualizacao datetime(6) NOT NULL, "
            "cliente_id bigint NOT NULL, "
            "criado_por_id bigint NULL, "
            "atualizado_por_id bigint NULL, "
            "liberada_para_cobranca_por_id bigint NULL, "
            "cobranca_realizada_por_id bigint NULL, "
            "CONSTRAINT fk_ordemservico_cliente FOREIGN KEY (cliente_id) REFERENCES clientes_cliente (id), "
            "CONSTRAINT fk_ordemservico_criado_por FOREIGN KEY (criado_por_id) REFERENCES contas_usuario (id), "
            "CONSTRAINT fk_ordemservico_atualizado_por FOREIGN KEY (atualizado_por_id) REFERENCES contas_usuario (id), "
            "CONSTRAINT fk_ordemservico_liberada_por FOREIGN KEY (liberada_para_cobranca_por_id) REFERENCES contas_usuario (id), "
            "CONSTRAINT fk_ordemservico_cobranca_por FOREIGN KEY (cobranca_realizada_por_id) REFERENCES contas_usuario (id)"
            ") ENGINE=InnoDB"
        ),
        sql_extra=(
            "ALTER TABLE ordens_servico_ordemservico "
            "CHANGE COLUMN data_criacao data_venda date NOT NULL, "
            "CHANGE COLUMN liberada_para_faturamento liberada_para_cobranca tinyint(1) NOT NULL, "
            "CHANGE COLUMN liberada_para_faturamento_em liberada_para_cobranca_em datetime(6) NULL, "
            "CHANGE COLUMN liberada_para_faturamento_por_id liberada_para_cobranca_por_id bigint NULL, "
            "CHANGE COLUMN faturada cobranca_realizada tinyint(1) NOT NULL, "
            "CHANGE COLUMN data_faturamento data_cobranca date NULL, "
            "CHANGE COLUMN faturada_por_id cobranca_realizada_por_id bigint NULL, "
            "ADD COLUMN data_acordada_cobranca date NULL"
        ),
    )


def _reverter_ordem_servico(apps, schema_editor):
    schema_editor.execute(
        "ALTER TABLE ordens_servico_ordemservico "
        "CHANGE COLUMN data_venda data_criacao date NOT NULL, "
        "CHANGE COLUMN liberada_para_cobranca liberada_para_faturamento tinyint(1) NOT NULL, "
        "CHANGE COLUMN liberada_para_cobranca_em liberada_para_faturamento_em datetime(6) NULL, "
        "CHANGE COLUMN liberada_para_cobranca_por_id liberada_para_faturamento_por_id bigint NULL, "
        "CHANGE COLUMN cobranca_realizada faturada tinyint(1) NOT NULL, "
        "CHANGE COLUMN data_cobranca data_faturamento date NULL, "
        "CHANGE COLUMN cobranca_realizada_por_id faturada_por_id bigint NULL, "
        "DROP COLUMN data_acordada_cobranca"
    )
    schema_editor.execute("ALTER TABLE ordens_servico_ordemservico RENAME TO ordem_servico_ordemservico")


def _migrar_servico(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'servicos_servico', 'ordens_servico_servico',
        sql_criar=(
            "CREATE TABLE ordens_servico_servico ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "descricao longtext NOT NULL, "
            "status varchar(15) NOT NULL, "
            "data_inicio date NULL, "
            "data_termino date NULL, "
            "data_conclusao date NULL, "
            "criado_em datetime(6) NOT NULL, "
            "atualizado_em datetime(6) NOT NULL, "
            "ordem_servico_id bigint NOT NULL, "
            "catalogo_id bigint NULL, "
            "terminado_por_id bigint NULL, "
            "CONSTRAINT fk_servico_ordem_servico FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico_ordemservico (id), "
            "CONSTRAINT fk_servico_catalogo FOREIGN KEY (catalogo_id) REFERENCES catalogo_catalogo (id), "
            "CONSTRAINT fk_servico_terminado_por FOREIGN KEY (terminado_por_id) REFERENCES contas_usuario (id)"
            ") ENGINE=InnoDB"
        ),
        sql_extra="ALTER TABLE ordens_servico_servico CHANGE COLUMN repositorio_id catalogo_id bigint NULL",
    )


def _reverter_servico(apps, schema_editor):
    schema_editor.execute("ALTER TABLE ordens_servico_servico CHANGE COLUMN catalogo_id repositorio_id bigint NULL")
    schema_editor.execute("ALTER TABLE ordens_servico_servico RENAME TO servicos_servico")


def _migrar_tarefa(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'tarefas_tarefa', 'ordens_servico_tarefa',
        sql_criar=(
            "CREATE TABLE ordens_servico_tarefa ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "descricao longtext NULL, "
            "data_inicio date NULL, "
            "data_termino date NULL, "
            "status varchar(15) NOT NULL, "
            "criada_em datetime(6) NOT NULL, "
            "atualizado_em datetime(6) NOT NULL, "
            "servico_id bigint NOT NULL, "
            "responsavel_id bigint NOT NULL, "
            "CONSTRAINT fk_tarefa_servico FOREIGN KEY (servico_id) REFERENCES ordens_servico_servico (id), "
            "CONSTRAINT fk_tarefa_responsavel FOREIGN KEY (responsavel_id) REFERENCES contas_usuario (id)"
            ") ENGINE=InnoDB"
        ),
    )


def _reverter_tarefa(apps, schema_editor):
    schema_editor.execute("ALTER TABLE ordens_servico_tarefa RENAME TO tarefas_tarefa")


def _migrar_ordem_servico_operacional(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'tarefas_minios', 'ordens_servico_ordemservicooperacional',
        sql_criar=(
            "CREATE TABLE ordens_servico_ordemservicooperacional ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "quantidade int unsigned NOT NULL, "
            "descricao longtext NULL, "
            "data_recebimento date NULL, "
            "data_inicio date NULL, "
            "data_termino date NULL, "
            "status varchar(15) NOT NULL, "
            "criada_em datetime(6) NOT NULL, "
            "atualizado_em datetime(6) NOT NULL, "
            "revisao_cliente tinyint(1) NOT NULL, "
            "gera_cobranca tinyint(1) NOT NULL, "
            "data_liberacao_cobranca datetime(6) NULL, "
            "cobranca_realizada tinyint(1) NOT NULL, "
            "numero_nf varchar(10) NULL, "
            "cliente_id bigint NOT NULL, "
            "catalogo_operacional_id bigint NOT NULL, "
            "responsavel_id bigint NOT NULL, "
            "liberada_cobranca_por_id bigint NULL, "
            "cobranca_realizada_por_id bigint NULL, "
            "CONSTRAINT fk_oso_cliente FOREIGN KEY (cliente_id) REFERENCES clientes_cliente (id), "
            "CONSTRAINT fk_oso_catalogo_operacional FOREIGN KEY (catalogo_operacional_id) REFERENCES catalogo_catalogooperacional (id), "
            "CONSTRAINT fk_oso_responsavel FOREIGN KEY (responsavel_id) REFERENCES contas_usuario (id), "
            "CONSTRAINT fk_oso_liberada_por FOREIGN KEY (liberada_cobranca_por_id) REFERENCES contas_usuario (id), "
            "CONSTRAINT fk_oso_cobranca_por FOREIGN KEY (cobranca_realizada_por_id) REFERENCES contas_usuario (id)"
            ") ENGINE=InnoDB"
        ),
        sql_extra=(
            "ALTER TABLE ordens_servico_ordemservicooperacional "
            "CHANGE COLUMN servico_id catalogo_operacional_id bigint NOT NULL, "
            "CHANGE COLUMN faturada cobranca_realizada tinyint(1) NOT NULL, "
            "CHANGE COLUMN faturada_por_id cobranca_realizada_por_id bigint NULL"
        ),
    )


def _reverter_ordem_servico_operacional(apps, schema_editor):
    schema_editor.execute(
        "ALTER TABLE ordens_servico_ordemservicooperacional "
        "CHANGE COLUMN catalogo_operacional_id servico_id bigint NOT NULL, "
        "CHANGE COLUMN cobranca_realizada faturada tinyint(1) NOT NULL, "
        "CHANGE COLUMN cobranca_realizada_por_id faturada_por_id bigint NULL"
    )
    schema_editor.execute("ALTER TABLE ordens_servico_ordemservicooperacional RENAME TO tarefas_minios")


def _renomear_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='ordem_servico', model='ordemservico').update(
        app_label='ordens_servico', model='ordemservico',
    )
    ContentType.objects.filter(app_label='servicos', model='servico').update(
        app_label='ordens_servico', model='servico',
    )
    ContentType.objects.filter(app_label='tarefas', model='tarefa').update(
        app_label='ordens_servico', model='tarefa',
    )
    ContentType.objects.filter(app_label='tarefas', model='minios').update(
        app_label='ordens_servico', model='ordemservicooperacional',
    )


def _reverter_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='ordens_servico', model='ordemservico').update(
        app_label='ordem_servico', model='ordemservico',
    )
    ContentType.objects.filter(app_label='ordens_servico', model='servico').update(
        app_label='servicos', model='servico',
    )
    ContentType.objects.filter(app_label='ordens_servico', model='tarefa').update(
        app_label='tarefas', model='tarefa',
    )
    ContentType.objects.filter(app_label='ordens_servico', model='ordemservicooperacional').update(
        app_label='tarefas', model='minios',
    )


class Migration(migrations.Migration):

    initial = True

    # Sem dependencies em ordem_servico/servicos/tarefas de propósito: essas
    # apps não existem mais no projeto. As funções acima decidem sozinhas
    # (via introspecção do banco) se precisam adotar uma tabela antiga ou
    # criar do zero.
    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('clientes', '0001_initial'),
        ('catalogo', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='OrdemServico',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('data_venda', models.DateField()),
                        ('concluida', models.BooleanField(default=False)),
                        ('status', models.CharField(choices=[('aberta', 'Aberta'), ('em_andamento', 'Em Andamento'), ('concluida', 'Concluída'), ('cancelada', 'Cancelada')], default='aberta', max_length=15)),
                        ('prioridade', models.CharField(choices=[('baixa', 'Baixa'), ('media', 'Média'), ('alta', 'Alta')], default='baixa', max_length=10)),
                        ('valor', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                        ('forma_pagamento', models.CharField(choices=[('pix', 'PIX'), ('credito', 'Crédito'), ('debito', 'Débito'), ('boleto', 'Boleto'), ('transferencia', 'Transferência'), ('dinheiro', 'Dinheiro'), ('cheque', 'Cheque'), ('outro', 'Outro')], default='boleto', max_length=15)),
                        ('quantidade_parcelas', models.IntegerField(blank=True, null=True)),
                        ('cobranca_imediata', models.BooleanField(default=False)),
                        ('data_acordada_cobranca', models.DateField(blank=True, null=True)),
                        ('nome_contato_envio_nf', models.CharField(default='', max_length=50)),
                        ('contato_envio_nf', models.EmailField(default='', max_length=254)),
                        ('observacao', models.TextField(blank=True, null=True)),
                        ('contrato', models.BooleanField(default=False)),
                        ('objeto_contrato', models.CharField(blank=True, max_length=255, null=True)),
                        ('contrato_data_inicio', models.DateField(blank=True, null=True)),
                        ('contrato_data_fim', models.DateField(blank=True, null=True)),
                        ('gestor_contrato_nome', models.CharField(blank=True, max_length=255, null=True)),
                        ('gestor_contrato_email', models.EmailField(blank=True, max_length=254, null=True)),
                        ('gestor_contrato_telefone', models.CharField(blank=True, max_length=30, null=True)),
                        ('liberada_para_cobranca', models.BooleanField(default=False)),
                        ('liberada_para_cobranca_em', models.DateTimeField(blank=True, null=True)),
                        ('cobranca_realizada', models.BooleanField(default=False)),
                        ('numero_nf', models.IntegerField(blank=True, null=True)),
                        ('data_cobranca', models.DateField(blank=True, null=True)),
                        ('criada_em', models.DateTimeField(auto_now_add=True)),
                        ('data_atualizacao', models.DateTimeField(auto_now=True)),
                        ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ordens_servico', to='clientes.cliente')),
                        ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_criadas', to=settings.AUTH_USER_MODEL)),
                        ('atualizado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_atualizadas', to=settings.AUTH_USER_MODEL)),
                        ('liberada_para_cobranca_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_liberadas_para_cobranca', to=settings.AUTH_USER_MODEL)),
                        ('cobranca_realizada_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_cobranca_realizada', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Ordem de Serviço',
                        'verbose_name_plural': 'Ordens de Serviço',
                        'ordering': ['-data_venda'],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_ordem_servico, _reverter_ordem_servico)],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Servico',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('descricao', models.TextField()),
                        ('status', models.CharField(choices=[('aberto', 'Aberto'), ('em_andamento', 'Em Andamento'), ('concluida', 'Concluído'), ('cancelado', 'Cancelado')], default='aberto', max_length=15)),
                        ('data_inicio', models.DateField(blank=True, null=True)),
                        ('data_termino', models.DateField(blank=True, null=True)),
                        ('data_conclusao', models.DateField(blank=True, null=True)),
                        ('criado_em', models.DateTimeField(auto_now_add=True)),
                        ('atualizado_em', models.DateTimeField(auto_now=True)),
                        ('ordem_servico', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='servicos', to='ordens_servico.ordemservico')),
                        ('catalogo', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='catalogo.catalogo')),
                        ('terminado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='servicos_terminados', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Serviço',
                        'verbose_name_plural': 'Serviços',
                        'ordering': ['ordem_servico', 'status'],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_servico, _reverter_servico)],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Tarefa',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('descricao', models.TextField(blank=True, null=True)),
                        ('data_inicio', models.DateField(blank=True, null=True)),
                        ('data_termino', models.DateField(blank=True, null=True)),
                        ('status', models.CharField(choices=[('aberta', 'Aberta'), ('em_andamento', 'Em Andamento'), ('concluida', 'Concluída'), ('cancelada', 'Cancelada')], default='aberta', max_length=15)),
                        ('criada_em', models.DateTimeField(auto_now_add=True)),
                        ('atualizado_em', models.DateTimeField(auto_now=True)),
                        ('servico', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tarefas', to='ordens_servico.servico')),
                        ('responsavel', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tarefas', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Tarefa',
                        'verbose_name_plural': 'Tarefas',
                        'ordering': ['servico', 'status'],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_tarefa, _reverter_tarefa)],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='OrdemServicoOperacional',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('quantidade', models.PositiveIntegerField(default=1)),
                        ('descricao', models.TextField(blank=True, null=True)),
                        ('data_recebimento', models.DateField(blank=True, null=True)),
                        ('data_inicio', models.DateField(blank=True, null=True)),
                        ('data_termino', models.DateField(blank=True, null=True)),
                        ('status', models.CharField(choices=[('nao_iniciado', 'Não Iniciado'), ('em_andamento', 'Em Andamento'), ('finalizada', 'Finalizada')], default='nao_iniciado', max_length=15)),
                        ('criada_em', models.DateTimeField(auto_now_add=True)),
                        ('atualizado_em', models.DateTimeField(auto_now=True)),
                        ('revisao_cliente', models.BooleanField(default=False)),
                        ('gera_cobranca', models.BooleanField(default=False)),
                        ('data_liberacao_cobranca', models.DateTimeField(blank=True, null=True)),
                        ('cobranca_realizada', models.BooleanField(default=False)),
                        ('numero_nf', models.CharField(blank=True, max_length=10, null=True)),
                        ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ordens_servico_operacionais', to='clientes.cliente')),
                        ('catalogo_operacional', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ordens_servico_operacionais', to='catalogo.catalogooperacional')),
                        ('responsavel', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ordens_servico_operacionais', to=settings.AUTH_USER_MODEL)),
                        ('liberada_cobranca_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_servico_operacionais_liberadas_cobranca', to=settings.AUTH_USER_MODEL)),
                        ('cobranca_realizada_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_servico_operacionais_cobranca_realizada', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Ordem de Serviço Operacional',
                        'verbose_name_plural': 'Ordens de Serviço Operacionais',
                        'ordering': ['-data_recebimento'],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_ordem_servico_operacional, _reverter_ordem_servico_operacional)],
        ),
        migrations.RunPython(_renomear_content_types, _reverter_content_types),
    ]
