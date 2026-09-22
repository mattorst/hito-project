import uuid
from datetime import time, timedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.parks.models import Park, Trail
from apps.trekkings.models import Trekking, TrackingPoint

User = get_user_model()


class TrackingPointSyncTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="sync_user",
            password="test-password-123",
        )

        self.other_user = User.objects.create_user(
            username="other_user",
            password="test-password-456",
        )

        self.park = Park.objects.create(
            name="Parque de Prueba",
            description="Parque utilizado para tests de sincronización.",
            region="Región de Prueba",
            latitude=-33.448900,
            longitude=-70.669300,
            default_return_time=time(8, 0),
            is_active=True,
        )

        self.trail = Trail.objects.create(
            park=self.park,
            name="Sendero de Prueba",
            description="Sendero utilizado para tests.",
            difficulty="EASY",
            status="OPEN",
            estimated_duration=timedelta(hours=2),
            distance_km=5.0,
            max_altitude=1200,
        )

        now = timezone.now()

        self.trekking = Trekking.objects.create(
            user=self.user,
            trail=self.trail,
            status="IN_PROGRESS",
            started_at=now,
            estimated_return_time=now + timedelta(hours=8),
            tracking_enabled=True,
        )

        self.second_trekking = Trekking.objects.create(
            user=self.user,
            trail=self.trail,
            status="IN_PROGRESS",
            started_at=now,
            estimated_return_time=now + timedelta(hours=8),
            tracking_enabled=True,
        )

        self.other_trekking = Trekking.objects.create(
            user=self.other_user,
            trail=self.trail,
            status="IN_PROGRESS",
            started_at=now,
            estimated_return_time=now + timedelta(hours=8),
            tracking_enabled=True,
        )

        self.url = reverse("sync")

        self.client.force_authenticate(user=self.user)

    def build_tracking_point_payload(
        self,
        *,
        local_id=None,
        trekking=None,
        latitude=-33.448900,
        longitude=-70.669300,
    ):
        return {
            "local_id": str(local_id or uuid.uuid4()),
            "trekking": (trekking or self.trekking).id,
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": 8.50,
            "altitude": 1200.25,
            "speed": 1.80,
            "recorded_at": timezone.now().isoformat(),
        }

    def test_tracking_point_is_created(self):
        payload = {"tracking_points": [self.build_tracking_point_payload()]}

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            TrackingPoint.objects.count(),
            1,
        )

        tracking_point = TrackingPoint.objects.first()

        self.assertEqual(
            tracking_point.trekking_id,
            self.trekking.id,
        )

    def test_repeated_local_id_does_not_create_duplicate(self):
        local_id = uuid.uuid4()

        payload = {
            "tracking_points": [
                self.build_tracking_point_payload(local_id=local_id)
            ]
        }

        first_response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        second_response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            TrackingPoint.objects.filter(local_id=local_id).count(),
            1,
        )

        self.assertIn(
            str(local_id),
            second_response.data["data"]["synced_local_ids"],
        )

    def test_same_local_id_with_different_trekking_is_rejected(self):
        local_id = uuid.uuid4()

        first_payload = {
            "tracking_points": [
                self.build_tracking_point_payload(
                    local_id=local_id,
                    trekking=self.trekking,
                )
            ]
        }

        first_response = self.client.post(
            self.url,
            first_payload,
            format="json",
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )

        second_payload = {
            "tracking_points": [
                self.build_tracking_point_payload(
                    local_id=local_id,
                    trekking=self.second_trekking,
                )
            ]
        }

        second_response = self.client.post(
            self.url,
            second_payload,
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            TrackingPoint.objects.filter(local_id=local_id).count(),
            1,
        )

        self.assertEqual(
            TrackingPoint.objects.get(local_id=local_id).trekking_id,
            self.trekking.id,
        )

        self.assertEqual(
            len(second_response.data["data"]["synced_local_ids"]),
            0,
        )

        self.assertEqual(
            second_response.data["data"]["failed"][0]["type"],
            "tracking_point",
        )

    def test_tracking_point_from_other_user_is_rejected(self):
        payload = {
            "tracking_points": [
                self.build_tracking_point_payload(
                    trekking=self.other_trekking
                )
            ]
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            TrackingPoint.objects.count(),
            0,
        )

    def test_invalid_latitude_is_rejected(self):
        payload = {
            "tracking_points": [
                self.build_tracking_point_payload(latitude=91.0)
            ]
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            TrackingPoint.objects.count(),
            0,
        )

    def test_invalid_longitude_is_rejected(self):
        payload = {
            "tracking_points": [
                self.build_tracking_point_payload(longitude=181.0)
            ]
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            TrackingPoint.objects.count(),
            0,
        )

    def test_invalid_local_id_is_rejected(self):
        payload = {
            "tracking_points": [
                self.build_tracking_point_payload(local_id="not-a-uuid")
            ]
        }

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            TrackingPoint.objects.count(),
            0,
        )