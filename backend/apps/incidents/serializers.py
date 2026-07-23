from rest_framework import serializers
from apps.incidents.models import Incident


class IncidentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Incident
        fields = (
            "id",
            "trekking",
            "incident_type",
            "description",
            "latitude",
            "longitude",
            "registered_at",
            "photo",
            "created_at",
        )