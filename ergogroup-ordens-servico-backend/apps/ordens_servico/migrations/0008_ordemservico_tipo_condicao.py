from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0007_preenche_setor_dos_servicos'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='tipo_condicao',
            field=models.CharField(choices=[('a_vista', 'À vista'), ('parcelado', 'Parcelado'), ('recorrente', 'Recorrente')], default='a_vista', max_length=10),
        ),
    ]
