from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.catalogo.models import Catalogo
from apps.catalogo.serializers.subitem_catalogo_serializer import (
    SubitemCatalogoSerializer,
)
from apps.catalogo.services import servicos_que_podem_mudar, validar_setor_que_recebe
from apps.organizacoes.models import Setor


class CatalogoSerializer(serializers.ModelSerializer):
    subitens = SubitemCatalogoSerializer(many=True, read_only=True)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)
    servicos_em_aberto = serializers.SerializerMethodField(
        help_text='Serviços deste catálogo abertos e ainda sem tarefas (novos ou a distribuir): os que podem mudar '
                  'de setor junto com o catálogo.',
    )
    mover_servicos_em_aberto = serializers.BooleanField(
        write_only=True, required=False, default=False,
        help_text='Ao mudar o setor: leva junto os serviços em aberto e sem tarefas (os demais ficam no setor antigo).',
    )

    class Meta:
        model = Catalogo
        fields = [
            'id', 'nome', 'descricao', 'setor', 'setor_nome', 'ativo', 'subitens', 'servicos_em_aberto',
            'mover_servicos_em_aberto',
        ]
        extra_kwargs = {
            'setor': {'help_text': 'Setor responsável por executar este serviço.'},
            # Sem default explícito, o DRF trata booleano ausente em form/multipart como False.
            'ativo': {'default': True},
        }

    @extend_schema_field(serializers.IntegerField())
    def get_servicos_em_aberto(self, catalogo):
        anotado = getattr(catalogo, 'servicos_em_aberto', None)
        return anotado if anotado is not None else servicos_que_podem_mudar([catalogo]).count()

    def validate_setor(self, setor):
        mudou = self.instance is None or self.instance.setor_id != setor.pk
        if mudou and not setor.ativo:
            raise serializers.ValidationError('Escolha um setor ativo.')
        return setor

    def validate(self, attrs):
        """Catálogo ativo só em setor com quem receba tarefas (revisão de permissões, P5): vale ao criar, ao mudar
        de setor e ao reativar."""
        setor = attrs.get('setor', getattr(self.instance, 'setor', None))
        ativo = attrs.get('ativo', getattr(self.instance, 'ativo', True))
        mudou_setor = self.instance is None or (setor is not None and setor.pk != self.instance.setor_id)
        reativou = self.instance is not None and ativo and not self.instance.ativo
        if setor is not None and ativo and (mudou_setor or reativou):
            validar_setor_que_recebe(setor)
        return attrs

    def create(self, validated_data):
        validated_data.pop('mover_servicos_em_aberto', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from apps.catalogo.services import mover_servicos_em_aberto

        mover = validated_data.pop('mover_servicos_em_aberto', False)
        setor_anterior = instance.setor_id
        catalogo = super().update(instance, validated_data)
        self.servicos_movidos = 0
        if mover and catalogo.setor_id != setor_anterior:
            self.servicos_movidos = mover_servicos_em_aberto([catalogo], catalogo.setor)
        return catalogo


class MudarSetorDosCatalogosSerializer(serializers.Serializer):
    catalogos = serializers.PrimaryKeyRelatedField(queryset=Catalogo.objects.all(), many=True, allow_empty=False)
    setor = serializers.PrimaryKeyRelatedField(queryset=Setor.objects.all())
    mover_servicos_em_aberto = serializers.BooleanField(
        required=False, default=False,
        help_text='Leva junto os serviços em aberto e sem tarefas desses catálogos (os demais ficam no setor antigo).',
    )


class ResultadoMudarSetorSerializer(serializers.Serializer):
    catalogos_alterados = serializers.IntegerField()
    servicos_movidos = serializers.IntegerField()
    avisos = serializers.ListField(child=serializers.CharField())
