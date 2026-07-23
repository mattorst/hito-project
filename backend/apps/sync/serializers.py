from rest_framework import serializers

from apps.trekkings.models import CheckpointRecord
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