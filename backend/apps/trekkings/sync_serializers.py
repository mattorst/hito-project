
from rest_framework import serializers

from apps.parks.models import Trail


class OfflineCompanionSerializer(serializers.Serializer):
    """
    Acompañante registrado originalmente en SQLite.

    El UUID es obligatorio para identificarlo
    durante los reintentos de sincronización.
    """

    local_id = serializers.UUIDField()

    first_name = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
    )

    last_name = serializers.CharField(
        max_length=100,
        allow_blank=False,
        trim_whitespace=True,
    )

    sex = serializers.ChoiceField(
        choices=["M", "F", "O", "N", ""],
        required=False,
        default="",
    )

    emergency_contact_name = serializers.CharField(
        max_length=150,
        allow_blank=False,
        trim_whitespace=True,
    )

    emergency_contact_phone = serializers.CharField(
        max_length=25,
        allow_blank=False,
        trim_whitespace=True,
    )


class OfflineTrekkingBootstrapSerializer(serializers.Serializer):
    """
    Primera etapa de sincronización de un trekking local.

    Recibe:
    - UUID creado por la aplicación.
    - Sendero seleccionado.
    - Hora real del Check-In QR.
    - Acompañantes registrados offline.

    No sincroniza todavía checkpoints,
    GPS, incidentes, rescates ni Check-Out.
    """

    local_id = serializers.UUIDField()

    trail = serializers.PrimaryKeyRelatedField(
        queryset=Trail.objects.select_related("park").all(),
    )

    started_at = serializers.DateTimeField()

    companions = OfflineCompanionSerializer(
        many=True,
        required=False,
        default=list,
    )

    def validate_companions(self, companions):
        local_ids = [
            str(companion["local_id"])
            for companion in companions
        ]

        if len(local_ids) != len(set(local_ids)):
            raise serializers.ValidationError(
                "No se permiten acompañantes con UUID duplicados."
            )

        return companions

    def validate(self, attrs):
        trail = attrs["trail"]

        if not trail.park_id:
            raise serializers.ValidationError({
                "trail": "El sendero no tiene un parque asociado."
            })

        return attrs
