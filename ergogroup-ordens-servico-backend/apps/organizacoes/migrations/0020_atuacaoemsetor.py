""""Também executa em" (revisão de permissões, P1)."""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizacoes', '0019_funcaopermissao_tarefas_receber'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AtuacaoEmSetor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('setor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='atuacoes', to='organizacoes.setor')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='atuacoes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Também executa em',
                'verbose_name_plural': 'Também executa em',
                'ordering': ['setor__nome'],
                'constraints': [models.UniqueConstraint(fields=('usuario', 'setor'), name='atuacao_unica_por_usuario_e_setor')],
            },
        ),
    ]
