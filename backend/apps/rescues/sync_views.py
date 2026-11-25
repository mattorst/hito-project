
from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError, transaction

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rescues.models import Rescue, RescueStatus
from apps.trekkings.models import Trekking


class RescueSyncSerializer(serializers.Serializer):
    local_id = serializers.UUIDField()

    trekking_local_id = serializers.UUIDField()

    status = serializers.ChoiceField(
        choices=[
            RescueStatus.ACTIVE,
            RescueStatus.CANCELLED,
        ],
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

    requested_at = serializers.DateTimeField()

    cancelled_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    def validate(self, data):
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError({
                "coordinates": (
                    "Las coordenadas deben estar completas."
                )
            })

        if latitude is not None:
            if not (-90 <= latitude <= 90):
                raise serializers.ValidationError({
                    "latitude": "Latitud fuera de rango."
                })

        if longitude is not None:
            if not (-180 <= longitude <= 180):
                raise serializers.ValidationError({
                    "longitude": "Longitud fuera de rango."
                })

        cancelled_at = data.get("cancelled_at")

        if data["status"] == RescueStatus.CANCELLED:
            if cancelled_at is None:
                raise serializers.ValidationError({
                    "cancelled_at": (
                        "Una cancelación debe incluir su fecha."
                    )
                })

            if cancelled_at < data["requested_at"]:
                raise serializers.ValidationError({
                    "cancelled_at": (
                        "No puede ser anterior a la solicitud."
                    )
                })

        elif cancelled_at is not None:
            raise serializers.ValidationError({
                "cancelled_at": (
                    "Una solicitud activa no tiene cancelación."
                )
            })

        return data


class RescueSyncAPIView(APIView):
    """Sincronización idempotente de SOS y cancelaciones offline."""

    permission_classes = [IsAuthenticated]

    @staticmethod
    def result(rescue):
        return {
            "id": rescue.pk,
            "local_id": str(rescue.local_id),
            "trekking_id": rescue.trekking_id,
            "status": rescue.status,
            "started_at": rescue.started_at.isoformat(),
            "finished_at": (
                rescue.finished_at.isoformat()
                if rescue.finished_at
                else None
            ),
        }

    @staticmethod
    def error(message, code):
        return Response(
            {
                "success": False,
                "message": message,
            },
            status=code,
        )

    def post(self, request):
        serializer = RescueSyncSerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Rescate inválido.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        trekking = Trekking.objects.filter(
            local_id=data["trekking_local_id"],
            user=request.user,
        ).first()

        if trekking is None:
            return self.error(
                "El trekking no existe o no pertenece a tu cuenta.",
                status.HTTP_404_NOT_FOUND,
            )

        try:
            with transaction.atomic():
                rescue = (
                    Rescue.objects.select_for_update()
                    .filter(local_id=data["local_id"])
                    .first()
                )

                created = rescue is None

                if rescue is not None:
                    if rescue.trekking_id != trekking.pk:
                        return self.error(
                            "El UUID ya pertenece a otro trekking.",
                            status.HTTP_409_CONFLICT,
                        )

                    if (
                        rescue.started_at != data["requested_at"]
                        or rescue.latitude != data.get("latitude")
                        or rescue.longitude != data.get("longitude")
                    ):
                        return self.error(
                            "Los datos originales del rescate no coinciden.",
                            status.HTTP_409_CONFLICT,
                        )

                    if rescue.status == RescueStatus.COMPLETED:
                        return self.error(
                            "El rescate ya fue completado por el personal responsable.",
                            status.HTTP_409_CONFLICT,
                        )

                    if (
                        rescue.status == RescueStatus.CANCELLED
                        and data["status"] == RescueStatus.ACTIVE
                    ):
                        return self.error(
                            "No se puede reactivar un rescate cancelado.",
                            status.HTTP_409_CONFLICT,
                        )

                else:
                    rescue = Rescue(
                        local_id=data["local_id"],
                        trekking=trekking,
                        started_at=data["requested_at"],
                        latitude=data.get("latitude"),
                        longitude=data.get("longitude"),
                    )

                if data["status"] == RescueStatus.CANCELLED:
                    if (
                        rescue.status == RescueStatus.CANCELLED
                        and rescue.finished_at != data["cancelled_at"]
                    ):
                        return self.error(
                            "La cancelación existente tiene otra fecha.",
                            status.HTTP_409_CONFLICT,
                        )

                    rescue.status = RescueStatus.CANCELLED
                    rescue.finished_at = data["cancelled_at"]
                    rescue.closed_reason = (
                        "Cancelado por el excursionista"
                    )

                else:
                    rescue.status = RescueStatus.ACTIVE
                    rescue.finished_at = None
                    rescue.closed_reason = ""

                rescue.save()

                return Response(
                    {
                        "success": True,
                        "message": (
                            "Rescate confirmado por Django."
                        ),
                        "data": self.result(rescue),
                    },
                    status=(
                        status.HTTP_201_CREATED
                        if created
                        else status.HTTP_200_OK
                    ),
                )

        except IntegrityError:
            return self.error(
                "Solicitud concurrente; vuelve a intentar sincronizar.",
                status.HTTP_409_CONFLICT,
            )

        except DjangoValidationError as exc:
            details = (
                exc.message_dict
                if hasattr(exc, "message_dict")
                else exc.messages
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        "El rescate no superó validaciones."
                    ),
                    "errors": details,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
