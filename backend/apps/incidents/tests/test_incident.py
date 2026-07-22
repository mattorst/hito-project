from datetime import time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.incidents.models import Incident, IncidentType
from apps.parks.models import Park, Trail, TrailDifficulty, TrailStatus
from apps.trekkings.models import Trekking, TrekkingStatus


class IncidentModelTests(TestCase):

    def setUp(self):
        """Crea la estructura base: usuario, parque, sendero y trekking activo."""
        self.user = CustomUser.objects.create_user(
            username="senderista_incidente",
            password="password123",
            email="incidente@hito.cl",
        )

        self.park = Park.objects.create(
            name="Parque Nacional Puyehue",
            description="Parque en la Región de Los Lagos",
            latitude=Decimal("-40.662500"),
            longitude=Decimal("-72.118900"),
            default_return_time=time(18, 0, 0),
        )

        trail_kwargs = {
            "park": self.park,
            "name": "Sendero El Caulle",
            "distance_km": 8.5,
            "estimated_duration": timedelta(hours=3),
            "max_altitude": 1200.0,
        }

        if hasattr(Trail, "elevation_gain"):
            trail_kwargs["elevation_gain"] = 500.0

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
            started_at=now - timedelta(hours=1),
            estimated_return_time=now + timedelta(hours=2),
            tracking_enabled=True,
        )

        # Determinar el tipo de incidente válido dinámicamente
        if hasattr(IncidentType, "choices") and IncidentType.choices:
            self.valid_incident_type = IncidentType.choices[0][0]
        elif hasattr(IncidentType, "ACCIDENT"):
            self.valid_incident_type = IncidentType.ACCIDENT
        elif hasattr(IncidentType, "OTHER"):
            self.valid_incident_type = IncidentType.OTHER
        else:
            self.valid_incident_type = "other"

    def create_valid_incident(self, **kwargs):
        """Construye un Incident completamente válido por defecto."""
        defaults = {
            "trekking": self.trekking,
            "incident_type": self.valid_incident_type,
            "description": "Torcedura de tobillo leve en el tramo rocoso.",
            "latitude": Decimal("-40.665000"),
            "longitude": Decimal("-72.120000"),
            "registered_at": timezone.now(),
            "photo": None,
        }
        defaults.update(kwargs)
        return Incident(**defaults)

    def test_valid_incident_is_saved(self):
        """1. Un incidente válido se guarda correctamente."""
        incident = self.create_valid_incident()
        incident.save()
        self.assertEqual(Incident.objects.count(), 1)

    def test_latitude_below_range_is_invalid(self):
        """2. Una latitud menor a -90 debe fallar."""
        incident = self.create_valid_incident(latitude=Decimal("-90.000100"))
        with self.assertRaises(ValidationError):
            incident.save()

    def test_latitude_above_range_is_invalid(self):
        """3. Una latitud mayor a 90 debe fallar."""
        incident = self.create_valid_incident(latitude=Decimal("90.000100"))
        with self.assertRaises(ValidationError):
            incident.save()

    def test_longitude_below_range_is_invalid(self):
        """4. Una longitud menor a -180 debe fallar."""
        incident = self.create_valid_incident(longitude=Decimal("-180.000100"))
        with self.assertRaises(ValidationError):
            incident.save()

    def test_longitude_above_range_is_invalid(self):
        """5. Una longitud mayor a 180 debe fallar."""
        incident = self.create_valid_incident(longitude=Decimal("180.000100"))
        with self.assertRaises(ValidationError):
            incident.save()

    def test_blank_description_is_invalid(self):
        """6. Descripción vacía o solo con espacios en blanco debe fallar."""
        incident = self.create_valid_incident(description="      ")
        with self.assertRaises(ValidationError):
            incident.save()

    def test_short_description_is_valid(self):
        """7. Una descripción corta (ej: 'Caída') debe guardarse correctamente."""
        incident = self.create_valid_incident(description="Caída")
        incident.save()
        self.assertEqual(Incident.objects.count(), 1)