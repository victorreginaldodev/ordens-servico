from rest_framework import serializers


class MesSerializer(serializers.Serializer):
    ano = serializers.IntegerField()
    mes = serializers.IntegerField()
    total = serializers.IntegerField()


class MesDecimalSerializer(serializers.Serializer):
    ano = serializers.IntegerField()
    mes = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
