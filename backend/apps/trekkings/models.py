from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.parks.models import Checkpoint, Trail


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

    # ¡MÉTODOS MOVIDOS AQUÍ DENTRO DE TREKKING!
    def clean(self):
        errors = {}

        if (
            self.started_at
            and self.estimated_return_time
            and self.estimated_return_time < self.started_at
        ):
            errors["estimated_return_time"] = (
                "La hora estimada de regreso no puede ser anterior al inicio del trekking."
            )

        if (
            self.finished_at
            and self.started_at
            and self.finished_at < self.started_at
        ):
            errors["finished_at"] = (
                "La hora de finalización no puede ser anterior al inicio del trekking."
            )

        if (
            self.status == TrekkingStatus.COMPLETED
            and self.finished_at is None
        ):
            errors["finished_at"] = (
                "Un trekking completado debe tener una fecha y hora de finalización."
            )

        if (
            self.finished_at is not None
            and self.status == TrekkingStatus.IN_PROGRESS
        ):
            errors["status"] = (
                "Un trekking con fecha de finalización no puede permanecer 'En progreso'."
            )

        if errors:
            raise ValidationError(errors)

        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class CheckpointRecord(models.Model):
    """
    Representa el registro cronológico e inmutable de un checkpoint
    alcanzado durante un trekking.
    """

    trekking = models.ForeignKey(
        Trekking,
        on_delete=models.CASCADE,
        related_name="checkpoint_records",
        verbose_name="Trekking",
    )

    checkpoint = models.ForeignKey(
        Checkpoint,
        on_delete=models.PROTECT,
        related_name="records",
        verbose_name="Checkpoint",
    )

    registered_at = models.DateTimeField(
        verbose_name="Fecha y hora del registro",
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Latitud registrada",
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Longitud registrada",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación",
    )

    class Meta:
        verbose_name = "Registro de checkpoint"
        verbose_name_plural = "Registros de checkpoints"
        ordering = ["registered_at"]

    def __str__(self):
        return (
            f"{self.trekking.user.username} | "
            f"{self.checkpoint.name} | "
            f"{self.registered_at:%d/%m/%Y %H:%M}"
        )