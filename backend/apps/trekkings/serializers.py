from rest_framework import serializers
from apps.trekkings.models import Trekking, CheckpointRecord
from apps.parks.models import Trail, Checkpoint


class TrekkingSerializer(serializers.ModelSerializer):
    """
    Serializer de lectura para representar un trekking existente.
    """

    class Meta:
        model = Trekking
        fields = (
            "id",
            "trail",
            "status",
            "started_at",
            "estimated_return_time",
            "finished_at",
            "tracking_enabled",
            "created_at",
        )


class StartTrekkingSerializer(serializers.Serializer):
    """
    Serializer utilizado para iniciar un nuevo trekking.
    """

    trail = serializers.PrimaryKeyRelatedField(
        queryset=Trail.objects.all()
    )


class CheckpointRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckpointRecord
        fields = [
            'id',
            'trekking',
            'checkpoint',
            'registered_at',
            'latitude',
            'longitude',
            'created_at',
        ]
        # Hacemos que latitude y longitude no sean obligatorias para el cliente que envía la petición
        extra_kwargs = {
            'latitude': {'required': False, 'allow_null': True},
            'longitude': {'required': False, 'allow_null': True},
            'created_at': {'read_only': True},
        }

    def create(self, validated_data):
        checkpoint = validated_data['checkpoint']
        
        # Asignamos las coordenadas del checkpoint físico antes de guardar y limpiar
        validated_data['latitude'] = checkpoint.latitude
        validated_data['longitude'] = checkpoint.longitude
        
        return CheckpointRecord.objects.create(**validated_data)