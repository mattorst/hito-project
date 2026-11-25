
from django.conf import settings
from django.db import models


class IncidentReviewStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    REVIEWING = "REVIEWING", "En revisión"
    RESOLVED = "RESOLVED", "Atendido"


class IncidentFollowUp(models.Model):
    """
    Estado de atención del guardaparque.

    El reporte original Incident permanece
    inalterado para conservar la información
    sincronizada desde Hito Mobile.
    """

    incident = models.OneToOneField(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="follow_up",
        verbose_name="Incidente",
    )

    status = models.CharField(
        max_length=20,
        choices=IncidentReviewStatus.choices,
        default=IncidentReviewStatus.PENDING,
        verbose_name="Estado de atención",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Últimas observaciones",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incident_followups_updated",
        verbose_name="Último funcionario",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última actualización",
    )

    class Meta:
        verbose_name = "Seguimiento de incidente"
        verbose_name_plural = "Seguimientos de incidentes"

    def __str__(self):
        return (
            f"Incidente #{self.incident_id} | "
            f"{self.get_status_display()}"
        )


class IncidentAuditLog(models.Model):
    """
    Historial de acciones del personal
    sobre el seguimiento de un incidente.
    """

    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.PROTECT,
        related_name="audit_logs",
        verbose_name="Incidente",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incident_audit_logs",
    )

    actor_username = models.CharField(
        max_length=150,
        verbose_name="Funcionario",
    )

    previous_status = models.CharField(
        max_length=20,
    )

    new_status = models.CharField(
        max_length=20,
    )

    previous_notes = models.TextField(
        blank=True,
    )

    new_notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "Auditoría de incidente"
        verbose_name_plural = "Auditorías de incidentes"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return (
            f"Incidente #{self.incident_id} | "
            f"{self.actor_username} | "
            f"{self.previous_status} -> "
            f"{self.new_status}"
        )
