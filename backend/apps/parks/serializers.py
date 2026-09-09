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

    def validate_route_geojson(self, value):
        if value is None:
            return value

        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "La geometría debe ser un objeto GeoJSON."
            )

        if value.get("type") != "LineString":
            raise serializers.ValidationError(
                "La geometría debe ser de tipo LineString."
            )

        coordinates = value.get("coordinates")

        if not isinstance(coordinates, list):
            raise serializers.ValidationError(
                "Las coordenadas deben ser una lista."
            )

        if len(coordinates) < 2:
            raise serializers.ValidationError(
                "La ruta debe contener al menos dos puntos."
            )

        for coordinate in coordinates:
            if (
                not isinstance(coordinate, list)
                or len(coordinate) != 2
            ):
                raise serializers.ValidationError(
                    "Cada coordenada debe tener [longitud, latitud]."
                )

            longitude, latitude = coordinate

            if not isinstance(longitude, (int, float)):
                raise serializers.ValidationError(
                    "La longitud debe ser numérica."
                )

            if not isinstance(latitude, (int, float)):
                raise serializers.ValidationError(
                    "La latitud debe ser numérica."
                )

            if not -180 <= longitude <= 180:
                raise serializers.ValidationError(
                    "La longitud está fuera de rango."
                )

            if not -90 <= latitude <= 90:
                raise serializers.ValidationError(
                    "La latitud está fuera de rango."
                )

        return value


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