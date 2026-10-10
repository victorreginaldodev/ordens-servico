from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0022_remove_ordemservico_gestor_contrato_nome'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ordemservico',
            name='gestor_contrato_email',
        ),
    ]
