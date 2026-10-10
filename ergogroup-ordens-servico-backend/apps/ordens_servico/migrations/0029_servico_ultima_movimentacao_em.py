import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0028_remove_tarefa_horas_estimadas'),
    ]

    operations = [
        migrations.AddField(
            model_name='servico',
            name='ultima_movimentacao_em',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
