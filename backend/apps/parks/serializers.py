from rest_framework import serializers

from apps.parks.models import Park, Trail, Checkpoint


class ParkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Park
        fields = (
            "id",
            "name",
            "description",
            "region",
            "latitude",
            "longitude",
            "default_return_time",
            "is_active",
        )


class TrailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trail
        fields = (
            "id",
            "park",
            "name",
            "description",
            "difficulty",
            "status",
            "estimated_duration",
            "distance_km",
            "max_altitude",
            "route_geojson",
        )


class CheckpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checkpoint
        fields = (
            "id",
            "trail",
            "name",
            "sequence",
            "checkpoint_type",
            "latitude",
            "longitude",
            "radius_meters",
            "qr_identifier",
        )