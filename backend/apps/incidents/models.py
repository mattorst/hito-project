from django.db import models

from apps.trekkings.models import Trekking


class IncidentType(models.TextChoices):
    PERSON_INJURED = "PERSON_INJURED", "Persona lesionada"
    DANGEROUS_ANIMAL = "DANGEROUS_ANIMAL", "Animal peligroso"
    LANDSLIDE = "LANDSLIDE", "Derrumbe"
    FALLEN_TREE = "FALLEN_TREE", "Árbol caído"
    BLOCKED_TRAIL = "BLOCKED_TRAIL", "Sendero bloqueado"
    LOST_PERSON = "LOST_PERSON", "Persona extraviada"
    WEATHER = "WEATHER", "Condiciones climáticas"
    OTHER = "OTHER", "Otro"


class Incident(models.Model):
    """
    Representa un incidente reportado durante un trekking.
    """

    trekking = models.ForeignKey(
        Trekking,
        on_delete=models.CASCADE,
        related_name="incidents",
        verbose_name="Trekking",
    )

    incident_type = models.CharField(
        max_length=30,
        choices=IncidentType.choices,
        verbose_name="Tipo de incidente",
    )

    description = models.TextField(
        verbose_name="Descripción",
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Latitud",
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Longitud",
    )

    registered_at = models.DateTimeField(
        verbose_name="Fecha y hora del registro",
    )

    photo = models.ImageField(
        upload_to="incidents/",
        null=True,
        blank=True,
        verbose_name="Fotografía",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación",
    )

    class Meta:
        verbose_name = "Incidente"
        verbose_name_plural = "Incidentes"
        ordering = ["registered_at"]

    def __str__(self):
        return (
            f"{self.get_incident_type_display()} | "
            f"{self.trekking.user.username} | "
            f"{self.registered_at:%d/%m/%Y %H:%M}"
        )