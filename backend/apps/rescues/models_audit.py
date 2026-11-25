
from django.conf import settings
from django.db import models


class RescueAuditAction(models.TextChoices):
    NOTES_UPDATED = (
        "NOTES_UPDATED",
        "Observaciones actualizadas",
    )

    COMPLETED = (
        "COMPLETED",
        "Rescate completado",
    )

    CANCELLED = (
        "CANCELLED",
        "Rescate cancelado",
    )


class RescueAuditLog(models.Model):
    """
    Historial de acciones realizadas desde
    el dashboard de guardaparques.

    Se crea un registro por cada modificación
    exitosa de observaciones o cierre.
    """

    rescue = models.ForeignKey(
        "rescues.Rescue",
        on_delete=models.PROTECT,
        related_name="audit_logs",
        verbose_name="Rescate",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rescue_audit_logs",
        verbose_name="Funcionario",
    )

    actor_username = models.CharField(
        max_length=150,
        verbose_name="Usuario al realizar la acción",
    )

    action = models.CharField(
        max_length=20,
        choices=RescueAuditAction.choices,
        verbose_name="Acción",
    )

    previous_status = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Estado anterior",
    )

    new_status = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Estado posterior",
    )

    previous_notes = models.TextField(
        blank=True,
        verbose_name="Observaciones anteriores",
    )

    new_notes = models.TextField(
        blank=True,
        verbose_name="Observaciones posteriores",
    )

    closed_reason = models.TextField(
        blank=True,
        verbose_name="Motivo de cierre registrado",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Fecha y hora de acción",
    )

    class Meta:
        verbose_name = "Auditoría de rescate"
        verbose_name_plural = "Auditorías de rescates"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["rescue", "-created_at"],
                name="rescue_audit_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Rescate #{self.rescue_id} | "
            f"{self.actor_username} | "
            f"{self.get_action_display()}"
        )
