
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

    def validate_trekking(self, trekking):
        request = self.context.get("request")

        if (
            request is None
            or not request.user.is_authenticated
            or trekking.user_id != request.user.id
        ):
            raise serializers.ValidationError(
                "El trekking no pertenece a tu cuenta."
            )

        return trekking
