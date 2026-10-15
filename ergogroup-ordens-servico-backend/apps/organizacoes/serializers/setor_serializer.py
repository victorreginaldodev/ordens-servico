from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.organizacoes.models import Setor


class OrganizadorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class SetorSerializer(serializers.ModelSerializer):
    organizadores = serializers.SerializerMethodField()
    sem_organizador = serializers.SerializerMethodField()
    catalogos_ativos = serializers.SerializerMethodField()
    executa_servicos = serializers.SerializerMethodField()
    recebem_tarefas = serializers.SerializerMethodField()
    sem_quem_receba = serializers.SerializerMethodField()

    class Meta:
        model = Setor
        fields = [
            'id', 'organizacao', 'nome', 'descricao', 'ativo', 'organizadores', 'sem_organizador',
            'catalogos_ativos', 'executa_servicos', 'recebem_tarefas', 'sem_quem_receba',
            'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']
        # Sem default explícito, o DRF trata booleano ausente em form/multipart como False.
        extra_kwargs = {'ativo': {'default': True}}

    def validate_ativo(self, ativo):
        """Setor com catálogos ativos não é desativado: os serviços vendidos desses catálogos iriam para um setor
        sem ninguém (revisão do catálogo, item 2). Quem desativa passa os catálogos a outro setor antes."""
        from apps.catalogo.services import motivo_para_nao_desativar_o_setor

        if self.instance is not None and self.instance.ativo and not ativo:
            motivo = motivo_para_nao_desativar_o_setor(self.instance)
            if motivo:
                raise serializers.ValidationError(motivo)
        return ativo

    def _organizadores(self, setor):
        if not hasattr(setor, '_organizadores_cache'):
            setor._organizadores_cache = setor.organizadores()
        return setor._organizadores_cache

    def _catalogos_ativos(self, setor):
        if not hasattr(setor, '_catalogos_ativos_cache'):
            setor._catalogos_ativos_cache = setor.catalogos.filter(ativo=True).count()
        return setor._catalogos_ativos_cache

    def _recebem(self, setor):
        if not hasattr(setor, '_recebem_cache'):
            setor._recebem_cache = setor.recebedores().count()
        return setor._recebem_cache

    @extend_schema_field(OrganizadorSerializer(many=True))
    def get_organizadores(self, setor):
        """Membros do setor que o organizam: quem tem `servicos.ver_setor` e `tarefas.distribuir` nele. Num setor que
        não executa serviços a lista vem vazia (revisão de permissões, P4): a diretoria não "organiza a Diretoria"."""
        if not self.get_executa_servicos(setor):
            return []
        return [{'id': usuario.id, 'nome': usuario.nome_completo} for usuario in self._organizadores(setor)]

    @extend_schema_field(serializers.BooleanField())
    def get_sem_organizador(self, setor):
        """Só faz sentido em setor que executa serviços: nos demais, nada chega para organizar."""
        return self.get_executa_servicos(setor) and not self._organizadores(setor)

    @extend_schema_field(serializers.IntegerField())
    def get_catalogos_ativos(self, setor):
        """Catálogos ativos que este setor executa (o papel do setor, P6)."""
        return self._catalogos_ativos(setor)

    @extend_schema_field(serializers.BooleanField())
    def get_executa_servicos(self, setor):
        """Verdadeiro quando o setor tem catálogos ativos: é para ele que vão os serviços vendidos."""
        return self._catalogos_ativos(setor) > 0

    @extend_schema_field(serializers.IntegerField())
    def get_recebem_tarefas(self, setor):
        """Quantas pessoas podem ser responsáveis por tarefas do setor (lotadas com "Recebe tarefas" ou que
        também executam nele)."""
        return self._recebem(setor)

    @extend_schema_field(serializers.BooleanField())
    def get_sem_quem_receba(self, setor):
        """Setor que executa serviços, mas não tem ninguém para receber as tarefas."""
        return self.get_executa_servicos(setor) and self._recebem(setor) == 0
