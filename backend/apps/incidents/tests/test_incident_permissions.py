
from datetime import time, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.incidents.models import Incident, IncidentType
from apps.parks.models import Park, Trail
from apps.trekkings.models import Trekking, TrekkingStatus


class IncidentAPIPermissionTests(TestCase):

    def setUp(self):
        self.owner = CustomUser.objects.create_user(
            username="incident_owner",
            password="password123",
        )

        self.other_user = CustomUser.objects.create_user(
            username="incident_other",
            password="password123",
        )

        self.park = Park.objects.create(
            name="Parque de Prueba",
            description="Parque para pruebas de permisos",
            latitude=Decimal("-35.440270"),
            longitude=Decimal("-71.639506"),
            default_return_time=time(18, 0),
        )

        self.trail = Trail.objects.create(
            park=self.park,
            name="Sendero de Prueba",
            distance_km=8.5,
            estimated_duration=timedelta(hours=3),
            max_altitude=1200.0,
        )

        now = timezone.now()

        self.trekking = Trekking.objects.create(
            user=self.owner,
            trail=self.trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=now - timedelta(hours=1),
            estimated_return_time=now + timedelta(hours=2),
            tracking_enabled=True,
        )

        self.client = APIClient()
        self.url = reverse("incident-create")

        self.payload = {
            "trekking": self.trekking.pk,
            "incident_type": IncidentType.choices[0][0],
            "description": "Incidente de prueba de permisos.",
            "latitude": "-35.440270",
            "longitude": "-71.639506",
            "registered_at": now.isoformat(),
        }

    def test_owner_can_create_incident(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            self.payload,
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Incident.objects.count(), 1)
        self.assertEqual(
            Incident.objects.first().trekking_id,
            self.trekking.pk,
        )

    def test_other_user_cannot_create_incident(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            self.url,
            self.payload,
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Incident.objects.count(), 0)
