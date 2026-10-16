from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.catalogo.models import Catalogo
from apps.catalogo.serializers.subitem_catalogo_serializer import (
    SubitemCatalogoSerializer,
)
from apps.catalogo.services import CONTADORES, com_contagem_de_servicos, mover_servicos, validar_setor_que_recebe
from apps.organizacoes.models import Setor

AJUDA_MOVER_EM_ABERTO = (
    'Leva para o setor do catálogo os serviços em aberto e sem tarefas (novos ou a distribuir) que estão em outro '
    'setor. Eles voltam a "novo" e o setor recebe o aviso de chegada.'
)
AJUDA_MOVER_COM_TAREFAS = (
    'Leva para o setor do catálogo os serviços já distribuídos ou em andamento que estão em outro setor, com as '
    'tarefas e os responsáveis como estão.'
)


class CatalogoSerializer(serializers.ModelSerializer):
    subitens = SubitemCatalogoSerializer(many=True, read_only=True)
    setor_nome = serializers.CharField(source='setor.nome', read_only=True)
    servicos_em_aberto = serializers.SerializerMethodField(
        help_text='Serviços deste catálogo abertos e ainda sem tarefas (novos ou a distribuir), em qualquer setor.',
    )
    servicos_com_tarefas = serializers.SerializerMethodField(
        help_text='Serviços deste catálogo já distribuídos ou em andamento, em qualquer setor.',
    )
    servicos_em_aberto_fora_do_setor = serializers.SerializerMethodField(
        help_text='Dos `servicos_em_aberto`, os que estão em outro setor que não o do catálogo.',
    )
    servicos_com_tarefas_fora_do_setor = serializers.SerializerMethodField(
        help_text='Dos `servicos_com_tarefas`, os que estão em outro setor que não o do catálogo.',
    )
    mover_servicos_em_aberto = serializers.BooleanField(
        write_only=True, required=False, default=False, help_text=AJUDA_MOVER_EM_ABERTO,
    )
    mover_servicos_com_tarefas = serializers.BooleanField(
        write_only=True, required=False, default=False, help_text=AJUDA_MOVER_COM_TAREFAS,
    )

    class Meta:
        model = Catalogo
        fields = [
            'id', 'nome', 'descricao', 'setor', 'setor_nome', 'ativo', 'subitens', *CONTADORES,
            'mover_servicos_em_aberto', 'mover_servicos_com_tarefas',
        ]
        extra_kwargs = {
            'setor': {'help_text': 'Setor responsável por executar este serviço.'},
            # Sem default explícito, o DRF trata booleano ausente em form/multipart como False.
            'ativo': {'default': True},
        }

    def _contador(self, catalogo, nome):
        """Vem anotado na listagem (`com_contagem_de_servicos`); sem a anotação, conta uma vez para os quatro."""
        if not all(hasattr(catalogo, campo) for campo in CONTADORES):
            contagem = com_contagem_de_servicos(Catalogo.objects.filter(pk=catalogo.pk)).values(*CONTADORES).get()
            for campo, valor in contagem.items():
                setattr(catalogo, campo, valor)
        return getattr(catalogo, nome)

    @extend_schema_field(serializers.IntegerField())
    def get_servicos_em_aberto(self, catalogo):
        return self._contador(catalogo, 'servicos_em_aberto')

    @extend_schema_field(serializers.IntegerField())
    def get_servicos_com_tarefas(self, catalogo):
        return self._contador(catalogo, 'servicos_com_tarefas')

    @extend_schema_field(serializers.IntegerField())
    def get_servicos_em_aberto_fora_do_setor(self, catalogo):
        return self._contador(catalogo, 'servicos_em_aberto_fora_do_setor')

    @extend_schema_field(serializers.IntegerField())
    def get_servicos_com_tarefas_fora_do_setor(self, catalogo):
        return self._contador(catalogo, 'servicos_com_tarefas_fora_do_setor')

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
        validated_data.pop('mover_servicos_com_tarefas', None)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        """Com as caixas marcadas, leva para o setor do catálogo (o novo, se mudou) os serviços ativos que estão em
        outro setor: vale ao mudar o setor e também depois, para os que ficaram para trás."""
        em_aberto = validated_data.pop('mover_servicos_em_aberto', False)
        com_tarefas = validated_data.pop('mover_servicos_com_tarefas', False)
        catalogo = super().update(instance, validated_data)
        self.servicos_movidos = mover_servicos([catalogo], catalogo.setor, em_aberto, com_tarefas)
        # Os contadores anotados na leitura ficaram velhos: a resposta conta de novo.
        for campo in CONTADORES:
            catalogo.__dict__.pop(campo, None)
        return catalogo


class MudarSetorDosCatalogosSerializer(serializers.Serializer):
    catalogos = serializers.PrimaryKeyRelatedField(queryset=Catalogo.objects.all(), many=True, allow_empty=False)
    setor = serializers.PrimaryKeyRelatedField(queryset=Setor.objects.all())
    mover_servicos_em_aberto = serializers.BooleanField(required=False, default=False, help_text=AJUDA_MOVER_EM_ABERTO)
    mover_servicos_com_tarefas = serializers.BooleanField(
        required=False, default=False, help_text=AJUDA_MOVER_COM_TAREFAS,
    )


class ResultadoMudarSetorSerializer(serializers.Serializer):
    catalogos_alterados = serializers.IntegerField()
    servicos_movidos = serializers.IntegerField()
    avisos = serializers.ListField(child=serializers.CharField())
