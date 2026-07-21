from datetime import time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.parks.models import Park, Trail, TrailDifficulty, TrailStatus
from apps.trekkings.models import Trekking, TrekkingStatus


class TrekkingModelTests(TestCase):

    def setUp(self):
        """Crea una base válida de usuario, parque y sendero para todas las pruebas."""
        self.user = CustomUser.objects.create_user(
            username="excursionista_test",
            password="password123",
            email="test@hito.cl",
        )

        self.park = Park.objects.create(
            name="Parque Nacional Torres del Paine",
            description="Parque nacional en la Patagonia chilena",
            latitude=-51.2532,
            longitude=-72.9862,
            default_return_time=time(18, 0, 0),
        )

        # Configuración completa del sendero incluyendo max_altitude
        trail_kwargs = {
            "park": self.park,
            "name": "Base Torres",
            "distance_km": 18.0,
            "estimated_duration": timedelta(hours=8),
            "max_altitude": 850.0,  # Valor obligatorio en metros sobre el nivel del mar
        }

        # Si tu modelo exige ganancia de elevación, se añade opcionalmente
        if hasattr(Trail, "elevation_gain"):
            trail_kwargs["elevation_gain"] = 750.0

        # Asignamos dificultad y estado si existen en la clase de opciones
        if hasattr(TrailDifficulty, "EASY"):
            trail_kwargs["difficulty"] = TrailDifficulty.EASY
        elif hasattr(TrailDifficulty, "MEDIUM"):
            trail_kwargs["difficulty"] = TrailDifficulty.MEDIUM

        if hasattr(TrailStatus, "OPEN"):
            trail_kwargs["status"] = TrailStatus.OPEN

        self.trail = Trail.objects.create(**trail_kwargs)

    def create_valid_trekking(self, **kwargs):
        """Construye un Trekking válido por defecto que permite sobrescribir campos."""
        now = timezone.now()
        defaults = {
            "user": self.user,
            "trail": self.trail,
            "status": TrekkingStatus.IN_PROGRESS,
            "started_at": now,
            "estimated_return_time": now + timedelta(hours=8),
            "finished_at": None,
            "tracking_enabled": True,
        }
        defaults.update(kwargs)
        return Trekking(**defaults)

    def test_valid_trekking_is_saved(self):
        """1. Un trekking válido debe guardarse correctamente."""
        trekking = self.create_valid_trekking()
        trekking.save()
        self.assertEqual(Trekking.objects.count(), 1)

    def test_estimated_return_before_start_is_invalid(self):
        """2. estimated_return_time no puede ser anterior a started_at."""
        now = timezone.now()
        trekking = self.create_valid_trekking(
            started_at=now,
            estimated_return_time=now - timedelta(hours=2),
        )
        with self.assertRaises(ValidationError):
            trekking.save()

    def test_finished_before_start_is_invalid(self):
        """3. finished_at no puede ser anterior a started_at."""
        now = timezone.now()
        trekking = self.create_valid_trekking(
            started_at=now,
            finished_at=now - timedelta(hours=1),
        )
        with self.assertRaises(ValidationError):
            trekking.save()

    def test_completed_requires_finished_at(self):
        """4. Un trekking COMPLETED requiere finished_at."""
        trekking = self.create_valid_trekking(
            status=TrekkingStatus.COMPLETED,
            finished_at=None,
        )
        with self.assertRaises(ValidationError):
            trekking.save()

    def test_non_completed_cannot_have_finished_at(self):
        """5. Un trekking que no está COMPLETED no debe tener finished_at."""
        now = timezone.now()
        trekking = self.create_valid_trekking(
            status=TrekkingStatus.IN_PROGRESS,
            finished_at=now + timedelta(hours=4),
        )
        with self.assertRaises(ValidationError):
            trekking.save()