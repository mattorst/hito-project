from rest_framework import serializers

from apps.rescues.models import Rescue


class RescueSerializer(serializers.ModelSerializer):

    class Meta:
        model = Rescue

        fields = (
            "id",
            "trekking",
            "status",
            "started_at",
            "finished_at",
            "closed_reason",
            "notes",
            "created_at",
        )