from datetime import time, timedelta
from decimal import Decimal

from django.test import TestCase

from apps.parks.models import (
    Checkpoint,
    CheckpointType,
    Park,
    Trail,
    TrailDifficulty,
    TrailStatus,
)
from apps.parks.serializers import (
    CheckpointSerializer,
    ParkSerializer,
    TrailSerializer,
)


class ParkSerializerTests(TestCase):

    def create_valid_park(self):
        return Park.objects.create(
            name="Parque Nacional Torres del Paine",
            description="Parque de prueba",
            region="Magallanes",
            latitude=Decimal("-51.000000"),
            longitude=Decimal("-73.000000"),
            default_return_time=time(18, 0, 0),
        )

    def test_serializer_contains_expected_fields(self):
        park = self.create_valid_park()
        data = ParkSerializer(park).data

        expected_fields = {
            "id",
            "name",
            "description",
            "region",
            "latitude",
            "longitude",
            "default_return_time",
            "is_active",
        }

        self.assertEqual(set(data.keys()), expected_fields)

    def test_serializer_returns_correct_values(self):
        park = self.create_valid_park()
        data = ParkSerializer(park).data

        self.assertEqual(data["name"], park.name)
        self.assertEqual(data["region"], park.region)
        self.assertEqual(
            Decimal(data["latitude"]),
            park.latitude,
        )


class TrailSerializerTests(TestCase):

    def create_valid_trail(self):
        park = Park.objects.create(
            name="Parque",
            description="Descripción",
            region="Región",
            latitude=Decimal("-51.000000"),
            longitude=Decimal("-73.000000"),
            default_return_time=time(18, 0, 0),
        )

        trail_kwargs = {
            "park": park,
            "name": "Base Torres",
            "description": "Sendero principal",
            "estimated_duration": timedelta(hours=8),
            "distance_km": Decimal("22.00"),
        }

        if hasattr(TrailDifficulty, "MODERATE"):
            trail_kwargs["difficulty"] = TrailDifficulty.MODERATE
        elif hasattr(TrailDifficulty, "MEDIUM"):
            trail_kwargs["difficulty"] = TrailDifficulty.MEDIUM

        if hasattr(TrailStatus, "OPEN"):
            trail_kwargs["status"] = TrailStatus.OPEN

        return Trail.objects.create(**trail_kwargs)

    def test_serializer_contains_expected_fields(self):
        trail = self.create_valid_trail()
        data = TrailSerializer(trail).data

        expected_fields = {
            "id",
            "park",
            "name",
            "description",
            "difficulty",
            "status",
            "estimated_duration",
            "distance_km",
        }

        self.assertEqual(set(data.keys()), expected_fields)

    def test_serializer_returns_correct_values(self):
        trail = self.create_valid_trail()
        data = TrailSerializer(trail).data

        self.assertEqual(data["name"], trail.name)
        self.assertEqual(data["difficulty"], trail.difficulty)
        self.assertEqual(data["status"], trail.status)


class CheckpointSerializerTests(TestCase):

    def create_valid_checkpoint(self):
        park = Park.objects.create(
            name="Parque",
            description="Descripción",
            region="Región",
            latitude=Decimal("-51.000000"),
            longitude=Decimal("-73.000000"),
            default_return_time=time(18, 0, 0),
        )

        trail_kwargs = {
            "park": park,
            "name": "Base Torres",
            "description": "Sendero",
            "estimated_duration": timedelta(hours=8),
            "distance_km": Decimal("22.00"),
        }

        if hasattr(TrailDifficulty, "MODERATE"):
            trail_kwargs["difficulty"] = TrailDifficulty.MODERATE
        elif hasattr(TrailDifficulty, "MEDIUM"):
            trail_kwargs["difficulty"] = TrailDifficulty.MEDIUM

        if hasattr(TrailStatus, "OPEN"):
            trail_kwargs["status"] = TrailStatus.OPEN

        trail = Trail.objects.create(**trail_kwargs)

        chk_type = (
            CheckpointType.choices[0][0]
            if hasattr(CheckpointType, "choices") and CheckpointType.choices
            else "checkpoint"
        )

        return Checkpoint.objects.create(
            trail=trail,
            name="Portería",
            sequence=1,
            checkpoint_type=chk_type,
            latitude=Decimal("-51.001000"),
            longitude=Decimal("-73.001000"),
            radius_meters=30,
            qr_identifier="QR-START-001",
        )

    def test_serializer_contains_expected_fields(self):
        checkpoint = self.create_valid_checkpoint()
        data = CheckpointSerializer(checkpoint).data

        expected_fields = {
            "id",
            "trail",
            "name",
            "sequence",
            "checkpoint_type",
            "latitude",
            "longitude",
            "radius_meters",
            "qr_identifier",
        }

        self.assertEqual(set(data.keys()), expected_fields)

    def test_serializer_returns_correct_values(self):
        checkpoint = self.create_valid_checkpoint()
        data = CheckpointSerializer(checkpoint).data

        self.assertEqual(data["name"], checkpoint.name)
        self.assertEqual(data["sequence"], checkpoint.sequence)
        self.assertEqual(
            data["qr_identifier"],
            checkpoint.qr_identifier,
        )