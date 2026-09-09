from rest_framework import serializers
from apps.rescues.models import Rescue, RescueStatus
from apps.trekkings.models import Trekking, TrekkingStatus


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
        read_only_fields = (
            "id",
            "status",
            "started_at",
            "finished_at",
            "closed_reason",
            "created_at",
        )

    def validate_trekking(self, trekking):
        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "El usuario debe estar autenticado."
            )

        if trekking.user_id != request.user.id:
            raise serializers.ValidationError(
                "El trekking no pertenece al usuario autenticado."
            )

        if trekking.status != TrekkingStatus.IN_PROGRESS:
            raise serializers.ValidationError(
                "El rescate solo puede solicitarse para un trekking en curso."
            )

        return trekking

    def validate(self, attrs):
        trekking = attrs["trekking"]

        if Rescue.objects.filter(
            trekking=trekking,
            status=RescueStatus.ACTIVE,
        ).exists():
            raise serializers.ValidationError(
                "Ya existe un rescate activo para este trekking."
            )

        return attrs