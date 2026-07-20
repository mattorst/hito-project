from django.core.exceptions import ValidationError  # <-- PASO 1.1: Asegurar esta importación
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

    # <-- PASO 1.2: Agregar el método clean exacto de ChatGPT alineado con __str__
    def clean(self):
        errors = {}

        if (
            self.started_at
            and self.finished_at
            and self.finished_at < self.started_at
        ):
            errors["finished_at"] = (
                "La fecha y hora de finalización no puede ser anterior al inicio del rescate."
            )

        if (
            self.status == RescueStatus.COMPLETED
            and self.finished_at is None
        ):
            errors["finished_at"] = (
                "Un rescate completado debe tener fecha y hora de finalización."
            )

        if (
            self.status == RescueStatus.CANCELLED
            and self.finished_at is None
        ):
            errors["finished_at"] = (
                "Un rescate cancelado debe tener fecha y hora de finalización."
            )

        if (
            self.status == RescueStatus.ACTIVE
            and self.finished_at is not None
        ):
            errors["status"] = (
                "Un rescate activo no puede tener fecha de finalización."
            )

        if (
            self.status in (
                RescueStatus.COMPLETED,
                RescueStatus.CANCELLED,
            )
            and not self.closed_reason.strip()
        ):
            errors["closed_reason"] = (
                "Debe indicar el motivo de cierre del rescate."
            )

        if (
            self.status == RescueStatus.ACTIVE
            and self.closed_reason.strip()
        ):
            errors["closed_reason"] = (
                "Un rescate activo no puede tener motivo de cierre."
            )

        if errors:
            raise ValidationError(errors)

        super().clean()

    # <-- PASO 1.3: Agregar la sobrescritura de save
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)