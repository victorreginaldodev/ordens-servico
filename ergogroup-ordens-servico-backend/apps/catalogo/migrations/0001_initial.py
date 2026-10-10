import django.db.models.deletion
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


def _migrar_catalogo(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'servicos_repositorio', 'catalogo_catalogo',
        sql_criar=(
            "CREATE TABLE catalogo_catalogo ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "nome varchar(100) NOT NULL, "
            "descricao longtext NULL"
            ") ENGINE=InnoDB"
        ),
    )


def _reverter_catalogo(apps, schema_editor):
    schema_editor.execute("ALTER TABLE catalogo_catalogo RENAME TO servicos_repositorio")


def _migrar_catalogo_operacional(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'tarefas_repositoriominios', 'catalogo_catalogooperacional',
        sql_criar=(
            "CREATE TABLE catalogo_catalogooperacional ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "nome varchar(50) NOT NULL, "
            "descricao longtext NULL"
            ") ENGINE=InnoDB"
        ),
    )


def _reverter_catalogo_operacional(apps, schema_editor):
    schema_editor.execute("ALTER TABLE catalogo_catalogooperacional RENAME TO tarefas_repositoriominios")


def _migrar_subitem_catalogo(apps, schema_editor):
    _migrar_ou_criar(
        schema_editor, 'servicos_subitemrepositorio', 'catalogo_subitemcatalogo',
        sql_criar=(
            "CREATE TABLE catalogo_subitemcatalogo ("
            "id bigint NOT NULL AUTO_INCREMENT PRIMARY KEY, "
            "nome varchar(150) NOT NULL, "
            "descricao longtext NULL, "
            "ativo tinyint(1) NOT NULL, "
            "ordem int unsigned NOT NULL, "
            "criado_em datetime(6) NOT NULL, "
            "atualizado_em datetime(6) NOT NULL, "
            "catalogo_id bigint NOT NULL, "
            "CONSTRAINT fk_subitemcatalogo_catalogo FOREIGN KEY (catalogo_id) REFERENCES catalogo_catalogo (id), "
            "CONSTRAINT unique_subitem_por_catalogo UNIQUE (catalogo_id, nome)"
            ") ENGINE=InnoDB"
        ),
        sql_extra=(
            "ALTER TABLE catalogo_subitemcatalogo "
            "CHANGE COLUMN repositorio_id catalogo_id bigint NOT NULL, "
            "RENAME INDEX unique_subitem_por_repositorio TO unique_subitem_por_catalogo"
        ),
    )


def _reverter_subitem_catalogo(apps, schema_editor):
    schema_editor.execute(
        "ALTER TABLE catalogo_subitemcatalogo "
        "CHANGE COLUMN catalogo_id repositorio_id bigint NOT NULL, "
        "RENAME INDEX unique_subitem_por_catalogo TO unique_subitem_por_repositorio"
    )
    schema_editor.execute("ALTER TABLE catalogo_subitemcatalogo RENAME TO servicos_subitemrepositorio")


def _renomear_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='servicos', model='repositorio').update(
        app_label='catalogo', model='catalogo',
    )
    ContentType.objects.filter(app_label='tarefas', model='repositoriominios').update(
        app_label='catalogo', model='catalogooperacional',
    )
    ContentType.objects.filter(app_label='servicos', model='subitemrepositorio').update(
        app_label='catalogo', model='subitemcatalogo',
    )


def _reverter_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='catalogo', model='catalogo').update(
        app_label='servicos', model='repositorio',
    )
    ContentType.objects.filter(app_label='catalogo', model='catalogooperacional').update(
        app_label='tarefas', model='repositoriominios',
    )
    ContentType.objects.filter(app_label='catalogo', model='subitemcatalogo').update(
        app_label='servicos', model='subitemrepositorio',
    )


class Migration(migrations.Migration):

    initial = True

    # Sem dependencies em ordem_servico/servicos/tarefas de propósito: essas
    # apps não existem mais no projeto. As funções acima decidem sozinhas
    # (via introspecção do banco) se precisam adotar uma tabela antiga ou
    # criar do zero, então não há necessidade de nenhuma dependência de
    # ordenação com um histórico de migrations que não existe mais.
    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Catalogo',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('nome', models.CharField(max_length=100)),
                        ('descricao', models.TextField(blank=True, null=True)),
                    ],
                    options={
                        'verbose_name': 'Catálogo',
                        'verbose_name_plural': 'Catálogos',
                        'ordering': ['nome'],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_catalogo, _reverter_catalogo)],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='CatalogoOperacional',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('nome', models.CharField(max_length=50)),
                        ('descricao', models.TextField(blank=True, null=True)),
                    ],
                    options={
                        'verbose_name': 'Catálogo Operacional',
                        'verbose_name_plural': 'Catálogos Operacionais',
                        'ordering': ['nome'],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_catalogo_operacional, _reverter_catalogo_operacional)],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='SubitemCatalogo',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('nome', models.CharField(max_length=150)),
                        ('descricao', models.TextField(blank=True, null=True)),
                        ('ativo', models.BooleanField(default=True)),
                        ('ordem', models.PositiveIntegerField(default=0)),
                        ('criado_em', models.DateTimeField(auto_now_add=True)),
                        ('atualizado_em', models.DateTimeField(auto_now=True)),
                        ('catalogo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subitens', to='catalogo.catalogo')),
                    ],
                    options={
                        'verbose_name': 'Subitem de catálogo',
                        'verbose_name_plural': 'Subitens de catálogo',
                        'ordering': ['catalogo__nome', 'ordem', 'nome'],
                        'constraints': [
                            models.UniqueConstraint(fields=('catalogo', 'nome'), name='unique_subitem_por_catalogo'),
                        ],
                    },
                ),
            ],
            database_operations=[migrations.RunPython(_migrar_subitem_catalogo, _reverter_subitem_catalogo)],
        ),
        migrations.RunPython(_renomear_content_types, _reverter_content_types),
    ]
