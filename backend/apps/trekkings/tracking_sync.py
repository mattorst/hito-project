
from decimal import (
    Decimal,
    InvalidOperation,
    ROUND_HALF_UP,
)
from math import isfinite

from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError, transaction

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.shared.responses import (
    error_response,
    success_response,
)
from apps.trekkings.models import (
    Trekking,
    TrackingPoint,
)


# ---------------------------------------------------------
# HITO — SINCRONIZACIÓN GPS OFFLINE-FIRST
#
# React Native / SQLite -> Django DRF -> MySQL
#
# Propiedades:
# - Autenticación JWT.
# - Propietario verificado por servidor.
# - Hasta 50 posiciones por solicitud.
# - UUID original de cada posición.
# - Fecha y hora originales.
# - Prevención de duplicados.
# - Transacción atómica por lote.
# - Compatible con trekkings finalizados.
# ---------------------------------------------------------

MAX_BATCH_SIZE = 50


class TrackingSyncError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# ---------------------------------------------------------
# SERIALIZADORES
# ---------------------------------------------------------

class OfflineTrackingPointSerializer(
    serializers.Serializer
):
    local_id = serializers.UUIDField()

    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    accuracy = serializers.FloatField(
        required=False,
        allow_null=True,
        default=None,
    )

    altitude = serializers.FloatField(
        required=False,
        allow_null=True,
        default=None,
    )

    speed = serializers.FloatField(
        required=False,
        allow_null=True,
        default=None,
    )

    recorded_at = serializers.DateTimeField()

    def validate(self, attrs):
        latitude = attrs["latitude"]
        longitude = attrs["longitude"]

        if not isfinite(latitude):
            raise serializers.ValidationError({
                "latitude": "La latitud no es válida."
            })

        if not isfinite(longitude):
            raise serializers.ValidationError({
                "longitude": "La longitud no es válida."
            })

        if not -90 <= latitude <= 90:
            raise serializers.ValidationError({
                "latitude": (
                    "Debe estar entre -90 y 90."
                )
            })

        if not -180 <= longitude <= 180:
            raise serializers.ValidationError({
                "longitude": (
                    "Debe estar entre -180 y 180."
                )
            })

        for field in (
            "accuracy",
            "altitude",
            "speed",
        ):
            value = attrs.get(field)

            if value is not None and not isfinite(value):
                raise serializers.ValidationError({
                    field: (
                        "El valor GPS no es válido."
                    )
                })

        accuracy = attrs.get("accuracy")

        if accuracy is not None and accuracy < 0:
            raise serializers.ValidationError({
                "accuracy": (
                    "La precisión no puede ser negativa."
                )
            })

        return attrs


class OfflineTrackingBatchSerializer(
    serializers.Serializer
):
    trekking_local_id = serializers.UUIDField()

    points = OfflineTrackingPointSerializer(
        many=True,
        allow_empty=False,
    )

    def validate_points(self, points):
        if len(points) > MAX_BATCH_SIZE:
            raise serializers.ValidationError(
                "El lote supera el máximo de 50 puntos GPS."
            )

        local_ids = [
            str(point["local_id"])
            for point in points
        ]

        if len(local_ids) != len(set(local_ids)):
            raise serializers.ValidationError(
                "El lote contiene UUID GPS duplicados."
            )

        return points


# ---------------------------------------------------------
# NORMALIZACIÓN DE PRECISIÓN
#
# El modelo TrackingPoint utiliza:
# - latitude / longitude: 6 decimales.
# - accuracy / altitude / speed: 2 decimales.
#
# Se normaliza antes de guardar y comparar,
# para mantener la idempotencia entre reintentos.
# ---------------------------------------------------------

def normalize_decimal(value, decimal_places):
    if value is None:
        return None

    try:
        step = Decimal("1").scaleb(
            -decimal_places
        )

        return Decimal(str(value)).quantize(
            step,
            rounding=ROUND_HALF_UP,
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        raise TrackingSyncError(
            "Un punto GPS contiene un número inválido."
        )


def normalized_point(point):
    return {
        "local_id": point["local_id"],
        "latitude": normalize_decimal(
            point["latitude"],
            6,
        ),
        "longitude": normalize_decimal(
            point["longitude"],
            6,
        ),
        "accuracy": normalize_decimal(
            point.get("accuracy"),
            2,
        ),
        "altitude": normalize_decimal(
            point.get("altitude"),
            2,
        ),
        "speed": normalize_decimal(
            point.get("speed"),
            2,
        ),
        "recorded_at": point["recorded_at"],
    }


# ---------------------------------------------------------
# COMPROBAR SI UN PUNTO YA EXISTE
# ---------------------------------------------------------

def same_tracking_point(existing, incoming, trekking):
    return (
        existing.trekking_id == trekking.pk
        and existing.latitude == incoming["latitude"]
        and existing.longitude == incoming["longitude"]
        and existing.accuracy == incoming["accuracy"]
        and existing.altitude == incoming["altitude"]
        and existing.speed == incoming["speed"]
        and existing.recorded_at == incoming["recorded_at"]
    )


# ---------------------------------------------------------
# ENDPOINT GPS
# ---------------------------------------------------------

class OfflineTrackingBatchAPIView(APIView):
    """
    Recibe un lote de puntos GPS capturados offline.

    Los UUID pertenecen a cada posición, no al
    identificador numérico de la base de datos.

    Se pueden sincronizar puntos de un trekking
    activo o previamente finalizado.

    Si un evento ya existe con los mismos datos,
    se confirma sin volver a insertarlo.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # -------------------------------------------------
        # 1. VALIDAR PETICIÓN
        # -------------------------------------------------

        serializer = OfflineTrackingBatchSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return error_response(
                message="Datos GPS inválidos.",
                errors=serializer.errors,
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        data = serializer.validated_data

        trekking_local_id = data[
            "trekking_local_id"
        ]

        points = [
            normalized_point(point)
            for point in data["points"]
        ]

        # -------------------------------------------------
        # 2. TRANSACCIÓN ATÓMICA
        # -------------------------------------------------

        try:
            with transaction.atomic():
                trekking = (
                    Trekking.objects
                    .select_for_update()
                    .filter(
                        local_id=trekking_local_id,
                        user=request.user,
                    )
                    .first()
                )

                if trekking is None:
                    raise TrackingSyncError(
                        "El trekking no existe en Django "
                        "o no pertenece a tu cuenta.",
                        status.HTTP_404_NOT_FOUND,
                    )

                acknowledged_ids = []
                created_count = 0

                # -----------------------------------------
                # 3. PROCESAR PUNTOS GPS
                # -----------------------------------------

                for point in points:
                    local_id = point["local_id"]

                    # Buscar el UUID de forma global.
                    # Un UUID no puede utilizarse
                    # en dos excursiones diferentes.

                    existing = (
                        TrackingPoint.objects
                        .select_for_update()
                        .filter(local_id=local_id)
                        .first()
                    )

                    if existing is not None:
                        if not same_tracking_point(
                            existing,
                            point,
                            trekking,
                        ):
                            raise TrackingSyncError(
                                "Un UUID GPS ya está "
                                "asociado a datos diferentes.",
                                status.HTTP_409_CONFLICT,
                            )

                        acknowledged_ids.append(
                            str(local_id)
                        )

                        continue

                    # El modelo aplica validaciones
                    # mediante full_clean() en save().

                    TrackingPoint.objects.create(
                        local_id=local_id,
                        trekking=trekking,
                        latitude=point["latitude"],
                        longitude=point["longitude"],
                        accuracy=point["accuracy"],
                        altitude=point["altitude"],
                        speed=point["speed"],
                        recorded_at=point["recorded_at"],
                    )

                    acknowledged_ids.append(
                        str(local_id)
                    )

                    created_count += 1

                # -----------------------------------------
                # 4. RESPUESTA CONFIRMADA
                # -----------------------------------------

                response_data = {
                    "trekking_id": trekking.pk,
                    "acknowledged_point_ids": (
                        acknowledged_ids
                    ),
                    "created": created_count,
                }

        # -------------------------------------------------
        # 5. ERRORES CON ROLLBACK
        # -------------------------------------------------

        except TrackingSyncError as exc:
            return error_response(
                message=exc.message,
                status_code=exc.status_code,
            )

        except DjangoValidationError as exc:
            errors = (
                exc.message_dict
                if hasattr(exc, "message_dict")
                else {"validation": exc.messages}
            )

            return error_response(
                message=(
                    "Un punto GPS no cumple "
                    "las validaciones de Django."
                ),
                errors=errors,
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        except IntegrityError:
            return error_response(
                message=(
                    "Conflicto al guardar los puntos GPS. "
                    "Reintenta con los mismos UUID."
                ),
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
            )

        # -------------------------------------------------
        # 6. CONFIRMACIÓN DE LOTE COMPLETO
        # -------------------------------------------------

        return success_response(
            data=response_data,
            message=(
                "Puntos GPS sincronizados correctamente."
            ),
            status_code=status.HTTP_200_OK,
        )
