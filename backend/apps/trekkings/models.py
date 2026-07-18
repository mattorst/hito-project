from django.conf import settings
from django.db import models

from apps.parks.models import Trail


class TrekkingStatus(models.TextChoices):
    PLANNED = "PLANNED", "Planificado"
    IN_PROGRESS = "IN_PROGRESS", "En progreso"
    COMPLETED = "COMPLETED", "Completado"
    RESCUE = "RESCUE", "Rescate"
    CANCELLED = "CANCELLED", "Cancelado"


class Trekking(models.Model):
    """
    Representa un recorrido realizado por un excursionista
    sobre un sendero determinado.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="trekkings",
        verbose_name="Excursionista",
    )

    trail = models.ForeignKey(
        Trail,
        on_delete=models.PROTECT,
        related_name="trekkings",
        verbose_name="Sendero",
    )

    status = models.CharField(
        max_length=20,
        choices=TrekkingStatus.choices,
        default=TrekkingStatus.PLANNED,
        verbose_name="Estado",
    )

    started_at = models.DateTimeField(
        verbose_name="Fecha y hora de inicio",
    )

    estimated_return_time = models.DateTimeField(
        verbose_name="Hora estimada de regreso",
    )

    finished_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha y hora de término",
    )

    tracking_enabled = models.BooleanField(
        default=True,
        verbose_name="Seguimiento de seguridad activado",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última actualización",
    )

    class Meta:
        verbose_name = "Trekking"
        verbose_name_plural = "Trekkings"
        ordering = ["-started_at"]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.trail.name} - "
            f"{self.get_status_display()}"
        )