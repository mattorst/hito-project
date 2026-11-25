
from rest_framework import serializers

from apps.trekkings.models import (
    Trekking,
    TrekkingCompanion,
    CheckpointRecord,
)
from apps.parks.models import Trail


class TrekkingCompanionSerializer(serializers.ModelSerializer):
    """
    Representa los datos de un acompañante.
    El UUID permite identificarlo durante la sincronización offline.
    """

    local_id = serializers.UUIDField(required=False)

    class Meta:
        model = TrekkingCompanion
        fields = (
            "local_id",
            "first_name",
            "last_name",
            "sex",
            "emergency_contact_name",
            "emergency_contact_phone",
        )
        extra_kwargs = {
            "first_name": {"allow_blank": False},
            "last_name": {"allow_blank": False},
            "emergency_contact_name": {"allow_blank": False},
            "emergency_contact_phone": {"allow_blank": False},
        }


class TrekkingSerializer(serializers.ModelSerializer):
    """
    Serializer de lectura de un trekking existente.
    Incluye los acompañantes y el aforo registrado.
    """

    companions = TrekkingCompanionSerializer(
        many=True,
        read_only=True,
    )

    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Trekking
        fields = (
            "id",
            "local_id",
            "trail",
            "status",
            "started_at",
            "estimated_return_time",
            "finished_at",
            "tracking_enabled",
            "created_at",
            "companions",
            "participant_count",
        )

    def get_participant_count(self, obj):
        # Una persona corresponde al líder autenticado.
        return 1 + len(obj.companions.all())



class StartTrekkingSerializer(serializers.Serializer):
    """
    Inicia un trekking individual o grupal.

    local_id:
        UUID opcional para mantener compatibilidad
        con clientes anteriores.

    companions:
        Lista opcional de acompañantes.
    """

    local_id = serializers.UUIDField(
        required=False,
    )

    trail = serializers.PrimaryKeyRelatedField(
        queryset=Trail.objects.all(),
    )

    companions = TrekkingCompanionSerializer(
        many=True,
        required=False,
        default=list,
    )

    def validate_companions(self, value):
        local_ids = [
            str(companion["local_id"])
            for companion in value
            if companion.get("local_id") is not None
        ]

        if len(local_ids) != len(set(local_ids)):
            raise serializers.ValidationError(
                "No se permiten acompañantes con el mismo local_id."
            )

        return value

class CheckpointRecordSerializer(serializers.ModelSerializer):
    """
    Registro de un checkpoint.
    La lógica QR existente se conserva.
    """

    class Meta:
        model = CheckpointRecord
        fields = [
            "id",
            "trekking",
            "checkpoint",
            "registered_at",
            "latitude",
            "longitude",
            "created_at",
        ]

        extra_kwargs = {
            "latitude": {
                "required": False,
                "allow_null": True,
            },
            "longitude": {
                "required": False,
                "allow_null": True,
            },
            "created_at": {
                "read_only": True,
            },
        }

    def create(self, validated_data):
        checkpoint = validated_data["checkpoint"]

        validated_data["latitude"] = checkpoint.latitude
        validated_data["longitude"] = checkpoint.longitude

        return CheckpointRecord.objects.create(
            **validated_data
        )
