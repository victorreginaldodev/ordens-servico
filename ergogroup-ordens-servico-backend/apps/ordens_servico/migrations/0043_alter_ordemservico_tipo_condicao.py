from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens_servico', '0042_ordemservico_vencimento_dias_apos_nota'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ordemservico',
            name='tipo_condicao',
            field=models.CharField(choices=[('a_vista', 'À vista'), ('parcelado', 'Parcelado')], default='a_vista', max_length=10),
        ),
    ]
