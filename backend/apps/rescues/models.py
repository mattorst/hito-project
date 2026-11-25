
from django.core.exceptions import ValidationError
from django.db import models

from .models_audit import RescueAuditLog, RescueAuditAction
from apps.trekkings.models import Trekking


class RescueStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Activo"
    COMPLETED = "COMPLETED", "Completado"
    CANCELLED = "CANCELLED", "Cancelado"


class Rescue(models.Model):
    """Operación de rescate asociada a un trekking."""

    # NULL para conservar rescates anteriores a esta migración.
    # UNIQUE impide duplicados en reintentos offline.
    local_id = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        editable=False,
        verbose_name="Identificador local de sincronización",
    )

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

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Latitud de solicitud",
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Longitud de solicitud",
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

    def clean(self):
        errors = {}

        if (self.latitude is None) != (self.longitude is None):
            errors["latitude"] = (
                "Las coordenadas deben estar completas "
                "o ambas ausentes."
            )

        if self.latitude is not None:
            if not (-90 <= self.latitude <= 90):
                errors["latitude"] = (
                    "La latitud debe estar entre -90 y 90 grados."
                )

        if self.longitude is not None:
            if not (-180 <= self.longitude <= 180):
                errors["longitude"] = (
                    "La longitud debe estar entre -180 y 180 grados."
                )

        if (
            self.started_at
            and self.finished_at
            and self.finished_at < self.started_at
        ):
            errors["finished_at"] = (
                "La finalización no puede ser anterior "
                "al inicio del rescate."
            )

        if self.status in (
            RescueStatus.COMPLETED,
            RescueStatus.CANCELLED,
        ):
            if self.finished_at is None:
                errors["finished_at"] = (
                    "Un rescate cerrado necesita fecha de cierre."
                )

            if not (self.closed_reason or "").strip():
                errors["closed_reason"] = (
                    "Debe indicar el motivo de cierre."
                )

        elif self.status == RescueStatus.ACTIVE:
            if self.finished_at is not None:
                errors["finished_at"] = (
                    "Un rescate activo no puede estar finalizado."
                )

            if (self.closed_reason or "").strip():
                errors["closed_reason"] = (
                    "Un rescate activo no tiene motivo de cierre."
                )

        if errors:
            raise ValidationError(errors)

        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
