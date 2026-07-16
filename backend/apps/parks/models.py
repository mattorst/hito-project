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
    

class TrailDifficulty(models.TextChoices):
    EASY = "EASY", "Fácil"
    MODERATE = "MODERATE", "Moderado"
    HARD = "HARD", "Difícil"
    EXPERT = "EXPERT", "Experto"


class TrailStatus(models.TextChoices):
    OPEN = "OPEN", "Abierto"
    CLOSED = "CLOSED", "Cerrado"
    MAINTENANCE = "MAINTENANCE", "Mantenimiento"


class Trail(models.Model):
    """
    Representa un sendero perteneciente a un parque.
    """

    park = models.ForeignKey(
        Park,
        on_delete=models.CASCADE,
        related_name="trails",
        verbose_name="Parque",
    )

    name = models.CharField(
        max_length=150,
        verbose_name="Nombre",
    )

    description = models.TextField(
        blank=True,
        verbose_name="Descripción",
    )

    difficulty = models.CharField(
        max_length=20,
        choices=TrailDifficulty.choices,
        default=TrailDifficulty.MODERATE,
        verbose_name="Dificultad",
    )

    status = models.CharField(
        max_length=20,
        choices=TrailStatus.choices,
        default=TrailStatus.OPEN,
        verbose_name="Estado",
    )

    estimated_duration = models.DurationField(
        verbose_name="Duración estimada",
    )

    distance_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name="Distancia (km)",
    )

    max_altitude = models.PositiveIntegerField(
        verbose_name="Altitud máxima (msnm)",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo",
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
        verbose_name = "Sendero"
        verbose_name_plural = "Senderos"
        ordering = ["park", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["park", "name"],
                name="unique_trail_name_per_park",
            )
        ]

    def __str__(self):
        return f"{self.park.name} - {self.name}"
    


class CheckpointType(models.TextChoices):
    ENTRY = "ENTRY", "Entrada"
    NORMAL = "NORMAL", "Normal"
    VIEWPOINT = "VIEWPOINT", "Mirador"
    REST = "REST", "Descanso"
    EXIT = "EXIT", "Salida"


class Checkpoint(models.Model):
    """
    Representa un punto de control perteneciente a un sendero.
    """

    trail = models.ForeignKey(
        Trail,
        on_delete=models.CASCADE,
        related_name="checkpoints",
        verbose_name="Sendero",
    )

    sequence = models.PositiveSmallIntegerField(
        verbose_name="Secuencia",
    )

    name = models.CharField(
        max_length=150,
        verbose_name="Nombre",
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

    radius_meters = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=15.0,
        verbose_name="Radio (metros)",
    )

    qr_identifier = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Identificador QR",
    )

    checkpoint_type = models.CharField(
        max_length=20,
        choices=CheckpointType.choices,
        default=CheckpointType.NORMAL,
        verbose_name="Tipo",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo",
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
        verbose_name = "Checkpoint"
        verbose_name_plural = "Checkpoints"
        ordering = ["trail", "sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["trail", "sequence"],
                name="unique_checkpoint_sequence_per_trail",
            ),
            models.UniqueConstraint(
                fields=["trail", "name"],
                name="unique_checkpoint_name_per_trail",
            ),
        ]

    def __str__(self):
        return f"{self.trail.name} - CP {self.sequence}: {self.name}"