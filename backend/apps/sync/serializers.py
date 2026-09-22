from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from rest_framework import serializers
from apps.trekkings.models import (
    CheckpointRecord,
    TrackingPoint,
)
from apps.incidents.models import Incident


class SyncCheckpointRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckpointRecord
        fields = (
            "trekking",
            "checkpoint",
            "registered_at",
            "latitude",
            "longitude",
        )


class SyncIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = (
            "trekking",
            "incident_type",
            "description",
            "latitude",
            "longitude",
            "registered_at",
            "photo",
        )


class SyncTrackingPointSerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90),
        ],
    )

    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180),
        ],
    )

    class Meta:
        model = TrackingPoint
        fields = (
            "local_id",
            "trekking",
            "latitude",
            "longitude",
            "accuracy",
            "altitude",
            "speed",
            "recorded_at",
        )
        extra_kwargs = {
            "local_id": {
                "required": True,
                "validators": [],
            },
            "accuracy": {
                "required": False,
                "allow_null": True,
            },
            "altitude": {
                "required": False,
                "allow_null": True,
            },
            "speed": {
                "required": False,
                "allow_null": True,
            },
        }

    def validate_trekking(self, trekking):
        request = self.context.get("request")

        if request is None:
            raise serializers.ValidationError(
                "No se pudo determinar el usuario autenticado."
            )

        if trekking.user_id != request.user.id:
            raise serializers.ValidationError(
                "El trekking no pertenece al usuario autenticado."
            )

        return trekking


class SyncSerializer(serializers.Serializer):
    checkpoint_records = SyncCheckpointRecordSerializer(
        many=True,
        required=False,
        default=list,
    )
    incidents = SyncIncidentSerializer(
        many=True,
        required=False,
        default=list,
    )
    tracking_points = SyncTrackingPointSerializer(
        many=True,
        required=False,
        default=list,
    )