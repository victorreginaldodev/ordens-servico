from django.db import migrations


def marcar_como_legado(apps, schema_editor):
    """Toda OSO que já existe quando a regra do catálogo entra fica com a cobrança congelada (ADR 0011, revisão de
    20/10/2026): a decisão gravada (no legado, a "Revisão do cliente") não muda, nem quando o catálogo mudar. As
    criadas depois desta migração seguem a regra do catálogo (padrão do campo)."""
    apps.get_model('ordens_servico', 'OrdemServicoOperacional').objects.update(regra_de_cobranca='legado')


def voltar(apps, schema_editor):
    apps.get_model('ordens_servico', 'OrdemServicoOperacional').objects.update(regra_de_cobranca='catalogo')


class Migration(migrations.Migration):
    dependencies = [
        ('ordens_servico', '0056_oso_regra_de_cobranca'),
    ]

    operations = [
        migrations.RunPython(marcar_como_legado, voltar),
    ]
