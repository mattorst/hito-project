
from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError, transaction

from rest_framework import serializers, status
from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.incidents.models import (
    Incident,
    IncidentType,
)

from apps.trekkings.models import Trekking

from apps.shared.responses import (
    success_response,
    error_response,
)


MAX_PHOTO_SIZE = 10 * 1024 * 1024


class OfflineIncidentSyncSerializer(
    serializers.Serializer
):
    local_id = serializers.UUIDField()

    trekking_local_id = serializers.UUIDField()

    incident_type = serializers.ChoiceField(
        choices=IncidentType.choices,
    )

    description = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )

    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
        default=None,
    )

    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
        default=None,
    )

    reported_at = serializers.DateTimeField()

    photo = serializers.ImageField(
        required=False,
    )

    def validate(self, attrs):
        latitude = attrs.get("latitude")
        longitude = attrs.get("longitude")

        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError({
                "coordinates": (
                    "Las coordenadas GPS están incompletas."
                )
            })

        if latitude is not None and not -90 <= latitude <= 90:
            raise serializers.ValidationError({
                "latitude": "Latitud fuera de rango."
            })

        if longitude is not None and not -180 <= longitude <= 180:
            raise serializers.ValidationError({
                "longitude": "Longitud fuera de rango."
            })

        photo = attrs.get("photo")

        if photo is not None and photo.size > MAX_PHOTO_SIZE:
            raise serializers.ValidationError({
                "photo": (
                    "La fotografía no puede superar 10 MB."
                )
            })

        return attrs


class OfflineIncidentSyncAPIView(APIView):
    """
    Sincroniza un incidente registrado offline.

    Recibe multipart/form-data para transferir
    la imagen real, no su ruta local.

    Utiliza local_id para impedir duplicados.
    """

    permission_classes = [IsAuthenticated]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    @staticmethod
    def same_incident(
        existing,
        trekking,
        data,
    ):
        return (
            existing.trekking_id == trekking.pk
            and existing.incident_type
                == data["incident_type"]
            and existing.description
                == data["description"]
            and existing.latitude
                == data.get("latitude")
            and existing.longitude
                == data.get("longitude")
            and existing.registered_at
                == data["reported_at"]
        )

    @staticmethod
    def response_data(incident):
        return {
            "id": incident.pk,
            "local_id": str(incident.local_id),
            "trekking_id": incident.trekking_id,
            "photo_uploaded": bool(incident.photo),
            "registered_at": (
                incident.registered_at.isoformat()
            ),
        }

    def post(self, request):
        serializer = OfflineIncidentSyncSerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            return error_response(
                message="Datos del incidente inválidos.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        trekking = Trekking.objects.filter(
            local_id=data["trekking_local_id"],
            user=request.user,
        ).first()

        if trekking is None:
            return error_response(
                message=(
                    "El trekking no existe en Django "
                    "o no pertenece a tu cuenta."
                ),
                status_code=status.HTTP_404_NOT_FOUND,
            )

        existing = Incident.objects.filter(
            local_id=data["local_id"]
        ).first()

        if existing is not None:
            return self.existing_response(
                existing,
                trekking,
                data,
            )

        try:
            with transaction.atomic():
                incident = Incident.objects.create(
                    local_id=data["local_id"],
                    trekking=trekking,
                    incident_type=data["incident_type"],
                    description=data["description"],
                    latitude=data.get("latitude"),
                    longitude=data.get("longitude"),
                    registered_at=data["reported_at"],
                    photo=data.get("photo"),
                )

        except IntegrityError:
            existing = Incident.objects.filter(
                local_id=data["local_id"]
            ).first()

            if existing is not None:
                return self.existing_response(
                    existing,
                    trekking,
                    data,
                )

            return error_response(
                message=(
                    "Conflicto de identificadores "
                    "al sincronizar el incidente."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        except DjangoValidationError as exc:
            return error_response(
                message=(
                    "El incidente no cumple las "
                    "validaciones de Django."
                ),
                errors=(
                    exc.message_dict
                    if hasattr(exc, "message_dict")
                    else {"validation": exc.messages}
                ),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        return success_response(
            data=self.response_data(incident),
            message="Incidente sincronizado correctamente.",
            status_code=status.HTTP_201_CREATED,
        )

    def existing_response(
        self,
        existing,
        trekking,
        data,
    ):
        if not self.same_incident(
            existing,
            trekking,
            data,
        ):
            return error_response(
                message=(
                    "El UUID local ya corresponde "
                    "a otro incidente."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        # Evita aceptar un reintento con fotografía
        # cuando el registro remoto no tiene imagen.

        if (
            data.get("photo") is not None
            and not existing.photo
        ):
            return error_response(
                message=(
                    "El incidente remoto existe, "
                    "pero su fotografía no fue guardada."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        return success_response(
            data=self.response_data(existing),
            message=(
                "Incidente previamente sincronizado."
            ),
            status_code=status.HTTP_200_OK,
        )
