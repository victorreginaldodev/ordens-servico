import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistroAuditoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entidade', models.CharField(choices=[('ordem_servico', 'Ordem de Serviço'), ('servico', 'Serviço'), ('tarefa', 'Tarefa'), ('mini_os', 'OS Operacional')], max_length=30)),
                ('objeto_id', models.PositiveBigIntegerField()),
                ('objeto_repr', models.CharField(blank=True, default='', max_length=255)),
                ('acao', models.CharField(choices=[('criacao', 'Criação'), ('atualizacao', 'Atualização'), ('exclusao', 'Exclusão'), ('status', 'Mudança de Status'), ('propagacao_status', 'Propagação de Status'), ('liberacao_faturamento', 'Liberação para Faturamento'), ('faturamento', 'Faturamento'), ('liberacao_cobranca', 'Liberação de Cobrança'), ('contrato', 'Contrato'), ('backfill', 'Backfill')], max_length=40)),
                ('origem', models.CharField(choices=[('api', 'API'), ('admin', 'Admin'), ('sistema', 'Sistema'), ('migracao', 'Migração')], default='sistema', max_length=20)),
                ('motivo', models.TextField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('alteracoes', models.JSONField(blank=True, default=dict)),
                ('snapshot', models.JSONField(blank=True, default=dict)),
                ('ordem_servico_id', models.PositiveBigIntegerField(blank=True, db_index=True, null=True)),
                ('servico_id', models.PositiveBigIntegerField(blank=True, db_index=True, null=True)),
                ('tarefa_id', models.PositiveBigIntegerField(blank=True, db_index=True, null=True)),
                ('mini_os_id', models.PositiveBigIntegerField(blank=True, db_index=True, null=True)),
                ('request_id', models.CharField(blank=True, max_length=64, null=True)),
                ('ip', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='registros_auditoria', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Registro de Auditoria',
                'verbose_name_plural': 'Registros de Auditoria',
                'ordering': ['-criado_em', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='registroauditoria',
            index=models.Index(fields=['entidade', 'objeto_id', '-criado_em'], name='auditoria_r_entidad_16cb4c_idx'),
        ),
        migrations.AddIndex(
            model_name='registroauditoria',
            index=models.Index(fields=['acao', '-criado_em'], name='auditoria_r_acao_9a738e_idx'),
        ),
    ]
