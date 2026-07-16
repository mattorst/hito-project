from django.db import models


class Park(models.Model):
    """
    Representa un parque o reserva natural administrada
    por el sistema Hito.
    """

    name = models.CharField(
        max_length=150,
        unique=True,
        verbose_name="Nombre"
    )

    description = models.TextField(
        blank=True,
        verbose_name="Descripción"
    )

    region = models.CharField(
        max_length=100,
        verbose_name="Región"
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Latitud"
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="Longitud"
    )

    default_return_time = models.TimeField(
        verbose_name="Hora límite de regreso"
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última actualización"
    )

    class Meta:
        verbose_name = "Parque"
        verbose_name_plural = "Parques"
        ordering = ["name"]

    def __str__(self):
        return self.name