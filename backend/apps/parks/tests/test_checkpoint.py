from datetime import time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.parks.models import Checkpoint, CheckpointType, Park, Trail


class CheckpointModelTests(TestCase):

    def setUp(self):
        """Crea la estructura base de Parque y Sendero para los puntos de control."""
        self.park = Park.objects.create(
            name="Parque Nacional Conguillío",
            description="Parque en la Región de La Araucanía",
            latitude=Decimal("-38.697000"),
            longitude=Decimal("-71.652100"),
            default_return_time=time(18, 0, 0),
        )

        trail_kwargs = {
            "park": self.park,
            "name": "Sierra Nevada",
            "distance_km": 10.0,
            "estimated_duration": timedelta(hours=4),
            "max_altitude": 1500.0,
        }

        if hasattr(Trail, "elevation_gain"):
            trail_kwargs["elevation_gain"] = 800.0

        self.trail = Trail.objects.create(**trail_kwargs)

        # Determinar el tipo de checkpoint válido dinámicamente según las opciones del modelo
        if hasattr(CheckpointType, "choices") and CheckpointType.choices:
            self.valid_checkpoint_type = CheckpointType.choices[0][0]
        elif hasattr(CheckpointType, "INTERMEDIATE"):
            self.valid_checkpoint_type = CheckpointType.INTERMEDIATE
        elif hasattr(CheckpointType, "CHECKPOINT"):
            self.valid_checkpoint_type = CheckpointType.CHECKPOINT
        else:
            self.valid_checkpoint_type = "checkpoint"

    def create_valid_checkpoint(self, **kwargs):
        """Construye un Checkpoint completamente válido por defecto."""
        defaults = {
            "trail": self.trail,
            "name": "Mirador Los Códores",
            "sequence": 1,
            "checkpoint_type": self.valid_checkpoint_type,
            "latitude": Decimal("-38.685000"),
            "longitude": Decimal("-71.640000"),
            "radius_meters": 50,
            "qr_identifier": "CHK-SIERRA-NEVADA-01",
        }
        defaults.update(kwargs)
        return Checkpoint(**defaults)

    def test_valid_checkpoint_is_saved(self):
        """1. Un checkpoint válido se guarda correctamente."""
        checkpoint = self.create_valid_checkpoint()
        checkpoint.save()
        self.assertEqual(Checkpoint.objects.count(), 1)

    def test_zero_radius_is_invalid(self):
        """2. Un radio igual a cero debe lanzar ValidationError."""
        checkpoint = self.create_valid_checkpoint(radius_meters=0)
        with self.assertRaises(ValidationError):
            checkpoint.save()

    def test_negative_radius_is_invalid(self):
        """3. Un radio negativo debe lanzar ValidationError."""
        checkpoint = self.create_valid_checkpoint(radius_meters=-10)
        with self.assertRaises(ValidationError):
            checkpoint.save()

    def test_latitude_below_range_is_invalid(self):
        """4. Una latitud menor a -90 debe fallar."""
        checkpoint = self.create_valid_checkpoint(latitude=Decimal("-90.000100"))
        with self.assertRaises(ValidationError):
            checkpoint.save()

    def test_latitude_above_range_is_invalid(self):
        """5. Una latitud mayor a 90 debe fallar."""
        checkpoint = self.create_valid_checkpoint(latitude=Decimal("90.000100"))
        with self.assertRaises(ValidationError):
            checkpoint.save()

    def test_longitude_below_range_is_invalid(self):
        """6. Una longitud menor a -180 debe fallar."""
        checkpoint = self.create_valid_checkpoint(longitude=Decimal("-180.000100"))
        with self.assertRaises(ValidationError):
            checkpoint.save()

    def test_longitude_above_range_is_invalid(self):
        """7. Una longitud mayor a 180 debe fallar."""
        checkpoint = self.create_valid_checkpoint(longitude=Decimal("180.000100"))
        with self.assertRaises(ValidationError):
            checkpoint.save()