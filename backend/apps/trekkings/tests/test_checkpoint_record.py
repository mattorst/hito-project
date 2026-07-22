from datetime import time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.parks.models import (
    Checkpoint,
    CheckpointType,
    Park,
    Trail,
    TrailDifficulty,
    TrailStatus,
)
from apps.trekkings.models import CheckpointRecord, Trekking, TrekkingStatus


class CheckpointRecordModelTests(TestCase):

    def setUp(self):
        """Configura usuario, parque, senderos, checkpoints y trekking activo."""
        self.user = CustomUser.objects.create_user(
            username="senderista_record",
            password="password123",
            email="record@hito.cl",
        )

        self.park = Park.objects.create(
            name="Parque Nacional Vicente Pérez Rosales",
            description="Parque en la Región de Los Lagos",
            latitude=Decimal("-41.140000"),
            longitude=Decimal("-72.330000"),
            default_return_time=time(18, 0, 0),
        )

        # 1. Sendero principal
        trail_kwargs = {
            "park": self.park,
            "name": "Sendero Paso Desolación",
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

        # 2. Checkpoints pertenecientes al sendero principal
        chk_type = (
            CheckpointType.choices[0][0]
            if hasattr(CheckpointType, "choices") and CheckpointType.choices
            else "checkpoint"
        )

        self.checkpoint_1 = Checkpoint.objects.create(
            trail=self.trail,
            name="Punto de Inicio / Control 1",
            sequence=1,
            checkpoint_type=chk_type,
            latitude=Decimal("-41.142000"),
            longitude=Decimal("-72.332000"),
            radius_meters=30,
            qr_identifier="CHK-DESOLACION-01",
        )

        self.checkpoint_2 = Checkpoint.objects.create(
            trail=self.trail,
            name="Mirador Volcán Osorno / Control 2",
            sequence=2,
            checkpoint_type=chk_type,
            latitude=Decimal("-41.145000"),
            longitude=Decimal("-72.335000"),
            radius_meters=30,
            qr_identifier="CHK-DESOLACION-02",
        )

        # 3. Segundo Sendero y Checkpoint de otro sendero (para la prueba de coherencia)
        trail_2_kwargs = {
            "park": self.park,
            "name": "Sendero Saltos del Petrohué",
            "distance_km": 3.0,
            "estimated_duration": timedelta(hours=1),
            "max_altitude": 200.0,
        }
        if hasattr(Trail, "elevation_gain"):
            trail_2_kwargs["elevation_gain"] = 50.0
        if hasattr(TrailDifficulty, "EASY"):
            trail_2_kwargs["difficulty"] = TrailDifficulty.EASY
        if hasattr(TrailStatus, "OPEN"):
            trail_2_kwargs["status"] = TrailStatus.OPEN

        self.other_trail = Trail.objects.create(**trail_2_kwargs)

        self.other_checkpoint = Checkpoint.objects.create(
            trail=self.other_trail,
            name="Control Petrohué",
            sequence=1,
            checkpoint_type=chk_type,
            latitude=Decimal("-41.170000"),
            longitude=Decimal("-72.400000"),
            radius_meters=30,
            qr_identifier="CHK-PETROHUE-01",
        )

        # 4. Trekking activo
        self.now = timezone.now()
        self.trekking = Trekking.objects.create(
            user=self.user,
            trail=self.trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=self.now - timedelta(hours=2),
            estimated_return_time=self.now + timedelta(hours=3),
            tracking_enabled=True,
        )

    def create_valid_checkpoint_record(self, **kwargs):
        """Construye un CheckpointRecord completamente válido por defecto."""
        defaults = {
            "trekking": self.trekking,
            "checkpoint": self.checkpoint_1,
            "registered_at": self.now - timedelta(hours=1),
            "latitude": Decimal("-41.142050"),
            "longitude": Decimal("-72.332050"),
        }
        defaults.update(kwargs)
        return CheckpointRecord(**defaults)

    def test_valid_checkpoint_record_is_saved(self):
        """1. Un registro de checkpoint válido se guarda correctamente."""
        record = self.create_valid_checkpoint_record()
        record.save()
        self.assertEqual(CheckpointRecord.objects.count(), 1)

    def test_registered_at_before_trekking_start_is_invalid(self):
        """2. Fecha de registro anterior al inicio del trekking debe fallar."""
        invalid_time = self.trekking.started_at - timedelta(minutes=10)
        record = self.create_valid_checkpoint_record(registered_at=invalid_time)
        with self.assertRaises(ValidationError):
            record.save()

    def test_checkpoint_from_different_trail_is_invalid(self):
        """3. Un checkpoint que no pertenece al sendero del trekking debe fallar."""
        record = self.create_valid_checkpoint_record(
            checkpoint=self.other_checkpoint
        )
        with self.assertRaises(ValidationError):
            record.save()

    def test_duplicate_checkpoint_is_allowed(self):
        """4. Permitido: registrar dos veces consecutivas el mismo checkpoint (Offline-First)."""
        time1 = self.now - timedelta(minutes=40)
        time2 = self.now - timedelta(minutes=20)

        record1 = self.create_valid_checkpoint_record(
            checkpoint=self.checkpoint_1, registered_at=time1
        )
        record1.save()

        record2 = self.create_valid_checkpoint_record(
            checkpoint=self.checkpoint_1, registered_at=time2
        )
        record2.save()

        self.assertEqual(CheckpointRecord.objects.count(), 2)

    def test_returning_to_previous_checkpoint_is_allowed(self):
        """5. Permitido: retroceder o volver a un checkpoint previo en la secuencia (CHK1 -> CHK2 -> CHK1)."""
        time1 = self.now - timedelta(minutes=50)
        time2 = self.now - timedelta(minutes=30)
        time3 = self.now - timedelta(minutes=10)

        r1 = self.create_valid_checkpoint_record(
            checkpoint=self.checkpoint_1, registered_at=time1
        )
        r1.save()

        r2 = self.create_valid_checkpoint_record(
            checkpoint=self.checkpoint_2, registered_at=time2
        )
        r2.save()

        r3 = self.create_valid_checkpoint_record(
            checkpoint=self.checkpoint_1, registered_at=time3
        )
        r3.save()

        self.assertEqual(CheckpointRecord.objects.count(), 3)