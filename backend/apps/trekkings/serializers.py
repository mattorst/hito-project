from rest_framework import serializers
from apps.trekkings.models import Trekking
from apps.parks.models import Trail


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