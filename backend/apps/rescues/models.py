from django.db import models

from apps.trekkings.models import Trekking


class RescueStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Activo"
    COMPLETED = "COMPLETED", "Completado"
    CANCELLED = "CANCELLED", "Cancelado"


class Rescue(models.Model):
    """
    Representa una operación de rescate asociada a un trekking.
    """

    trekking = models.ForeignKey(
        Trekking,
        on_delete=models.CASCADE,
        related_name="rescues",
        verbose_name="Trekking",
    )

    status = models.CharField(
        max_length=20,
        choices=RescueStatus.choices,
        default=RescueStatus.ACTIVE,
        verbose_name="Estado",
    )

    started_at = models.DateTimeField(
        verbose_name="Fecha y hora de inicio",
    )

    finished_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha y hora de finalización",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Observaciones",
    )

    closed_reason = models.TextField(
        blank=True,
        verbose_name="Motivo de cierre",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación",
    )

    class Meta:
        verbose_name = "Rescate"
        verbose_name_plural = "Rescates"
        ordering = ["-started_at"]

    def __str__(self):
        return (
            f"{self.trekking.user.username} | "
            f"{self.get_status_display()} | "
            f"{self.started_at:%d/%m/%Y %H:%M}"
        )