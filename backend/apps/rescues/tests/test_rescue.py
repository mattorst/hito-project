from datetime import time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.parks.models import Park, Trail, TrailDifficulty, TrailStatus
from apps.rescues.models import Rescue, RescueStatus
from apps.trekkings.models import Trekking, TrekkingStatus


class RescueModelTests(TestCase):

    def setUp(self):
        """Crea la base necesaria: usuario, parque, sendero y un trekking activo."""
        self.user = CustomUser.objects.create_user(
            username="excursionista_rescued",
            password="password123",
            email="rescued@hito.cl",
        )

        self.park = Park.objects.create(
            name="Parque Nacional Vicente Pérez Rosales",
            description="Parque nacional en la Región de Los Lagos",
            latitude=-41.1333,
            longitude=-72.0167,
            default_return_time=time(18, 0, 0),
        )

        trail_kwargs = {
            "park": self.park,
            "name": "Paso Desolación",
            "distance_km": 12.0,
            "estimated_duration": timedelta(hours=5),
            "max_altitude": 1100.0,
        }

        if hasattr(Trail, "elevation_gain"):
            trail_kwargs["elevation_gain"] = 600.0

        if hasattr(TrailDifficulty, "MEDIUM"):
            trail_kwargs["difficulty"] = TrailDifficulty.MEDIUM

        if hasattr(TrailStatus, "OPEN"):
            trail_kwargs["status"] = TrailStatus.OPEN

        self.trail = Trail.objects.create(**trail_kwargs)

        now = timezone.now()
        self.trekking = Trekking.objects.create(
            user=self.user,
            trail=self.trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=now - timedelta(hours=2),
            estimated_return_time=now + timedelta(hours=3),
            tracking_enabled=True,
        )

    def create_valid_rescue(self, **kwargs):
        """Construye un Rescue activo y válido por defecto."""
        now = timezone.now()
        defaults = {
            "trekking": self.trekking,
            "status": RescueStatus.ACTIVE,
            "started_at": now,
            "finished_at": None,
            "closed_reason": "",
            "notes": "Alerta iniciada por falta de reporte en checkpoint",
        }
        defaults.update(kwargs)
        return Rescue(**defaults)

    def test_valid_rescue_is_saved(self):
        """1. Un rescate válido en estado ACTIVE debe guardarse correctamente."""
        rescue = self.create_valid_rescue()
        rescue.save()
        self.assertEqual(Rescue.objects.count(), 1)

    def test_finished_before_start_is_invalid(self):
        """2. finished_at no puede ser anterior a started_at."""
        now = timezone.now()
        rescue = self.create_valid_rescue(
            started_at=now,
            finished_at=now - timedelta(minutes=30),
            status=RescueStatus.COMPLETED,
            closed_reason="Rescate exitoso",
        )
        with self.assertRaises(ValidationError):
            rescue.save()

    def test_active_cannot_have_finished_at(self):
        """3. Un rescate ACTIVE no puede tener finished_at."""
        now = timezone.now()
        rescue = self.create_valid_rescue(
            status=RescueStatus.ACTIVE,
            finished_at=now + timedelta(hours=1),
        )
        with self.assertRaises(ValidationError):
            rescue.save()

    def test_completed_requires_finished_at(self):
        """4. Un rescate COMPLETED requiere fecha de término (finished_at)."""
        rescue = self.create_valid_rescue(
            status=RescueStatus.COMPLETED,
            finished_at=None,
            closed_reason="Excursionista encontrado con bien.",
        )
        with self.assertRaises(ValidationError):
            rescue.save()

    def test_cancelled_requires_finished_at(self):
        """5. Un rescate CANCELLED requiere fecha de término (finished_at)."""
        rescue = self.create_valid_rescue(
            status=RescueStatus.CANCELLED,
            finished_at=None,
            closed_reason="Falsa alarma, el excursionista se reportó.",
        )
        with self.assertRaises(ValidationError):
            rescue.save()

    def test_closed_status_requires_closed_reason(self):
        """6. Estados cerrados (COMPLETED o CANCELLED) exigen closed_reason."""
        now = timezone.now()

        # Probar COMPLETED sin closed_reason
        rescue_completed = self.create_valid_rescue(
            status=RescueStatus.COMPLETED,
            finished_at=now + timedelta(hours=2),
            closed_reason="",
        )
        with self.assertRaises(ValidationError):
            rescue_completed.save()

        # Probar CANCELLED sin closed_reason
        rescue_cancelled = self.create_valid_rescue(
            status=RescueStatus.CANCELLED,
            finished_at=now + timedelta(hours=1),
            closed_reason="   ",  # Espacios en blanco
        )
        with self.assertRaises(ValidationError):
            rescue_cancelled.save()

    def test_active_cannot_have_closed_reason(self):
        """7. Un rescate ACTIVE no debe tener closed_reason asignado."""
        rescue = self.create_valid_rescue(
            status=RescueStatus.ACTIVE,
            closed_reason="Razón puesta antes de tiempo",
        )
        with self.assertRaises(ValidationError):
            rescue.save()