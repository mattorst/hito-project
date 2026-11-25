
from django.db import models


class OfflineCheckpointEvent(models.Model):
    """
    Evento QR generado por Hito Mobile y recibido
    mediante sincronización offline.

    Cada UUID identifica un evento concreto.
    Nunca se sustituye por el ID de Django.
    """

    class EventType(models.TextChoices):
        CHECK_IN = "CHECK_IN", "Check-In"
        CHECKPOINT_OUTBOUND = (
            "CHECKPOINT_OUTBOUND",
            "Checkpoint ida",
        )
        CHECKPOINT_RETURN = (
            "CHECKPOINT_RETURN",
            "Checkpoint regreso",
        )
        SUMMIT_ARRIVAL = (
            "SUMMIT_ARRIVAL",
            "Llegada a cima",
        )
        SUMMIT_DESCENT = (
            "SUMMIT_DESCENT",
            "Inicio descenso",
        )
        CHECK_OUT = "CHECK_OUT", "Check-Out"

    local_id = models.UUIDField(
        unique=True,
        editable=False,
    )

    trekking = models.ForeignKey(
        "trekkings.Trekking",
        on_delete=models.PROTECT,
        related_name="offline_checkpoint_events",
    )

    checkpoint = models.ForeignKey(
        "parks.Checkpoint",
        on_delete=models.PROTECT,
        related_name="offline_sync_events",
    )

    qr_identifier = models.CharField(
        max_length=255,
    )

    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
    )

    occurred_at = models.DateTimeField()

    received_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["occurred_at", "id"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "trekking",
                    "checkpoint",
                    "event_type",
                ],
                name="uq_offline_qr_trekking_cp_type",
            ),
        ]

    def __str__(self):
        return (
            f"{self.trekking_id} | "
            f"{self.event_type} | "
            f"{self.checkpoint_id}"
        )
