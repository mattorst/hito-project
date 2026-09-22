from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.trekkings.models import (
    CheckpointRecord,
    TrackingPoint,
)
from apps.incidents.models import Incident
from apps.sync.serializers import SyncSerializer
from apps.shared.responses import success_response, error_response


def create_checkpoint_record(data):
    return CheckpointRecord.objects.create(**data)


def create_tracking_point(data):
    return TrackingPoint.objects.create(**data)


def create_incident(data):
    return Incident.objects.create(**data)


class SyncAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SyncSerializer

    @extend_schema(
        request=SyncSerializer,
        summary="Sincronizar eventos fuera de línea",
        description=(
            "Recibe lotes de registros de checkpoints, "
            "incidentes y puntos de tracking creados "
            "offline para persistirlos en la base de datos."
        ),
    )
    def post(self, request):
        serializer = SyncSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al procesar la sincronización",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        checkpoint_records_data = data.get("checkpoint_records", [])
        incidents_data = data.get("incidents", [])
        tracking_points_data = data.get("tracking_points", [])

        created = {
            "checkpoint_records": 0,
            "incidents": 0,
            "tracking_points": 0,
        }

        synced_local_ids = []
        failed = []

        for index, checkpoint_data in enumerate(checkpoint_records_data):
            try:
                create_checkpoint_record(checkpoint_data)
                created["checkpoint_records"] += 1
            except Exception as error:
                failed.append(
                    {
                        "type": "checkpoint_record",
                        "index": index,
                        "error": str(error),
                    }
                )

        for index, incident_data in enumerate(incidents_data):
            try:
                create_incident(incident_data)
                created["incidents"] += 1
            except Exception as error:
                failed.append(
                    {
                        "type": "incident",
                        "index": index,
                        "error": str(error),
                    }
                )

        for index, tracking_point_data in enumerate(tracking_points_data):
            try:
                local_id = tracking_point_data["local_id"]

                existing_tracking_point = TrackingPoint.objects.filter(
                    local_id=local_id
                ).first()

                if existing_tracking_point is not None:
                    if (
                        existing_tracking_point.trekking_id
                        != tracking_point_data["trekking"].id
                    ):
                        failed.append(
                            {
                                "type": "tracking_point",
                                "index": index,
                                "local_id": str(local_id),
                                "error": (
                                    "El local_id ya está asociado "
                                    "a otro trekking."
                                ),
                            }
                        )
                        continue

                    synced_local_ids.append(str(local_id))
                    continue

                create_tracking_point(tracking_point_data)
                created["tracking_points"] += 1
                synced_local_ids.append(str(local_id))

            except Exception as error:
                failed.append(
                    {
                        "type": "tracking_point",
                        "index": index,
                        "local_id": tracking_point_data.get("local_id"),
                        "error": str(error),
                    }
                )

        return success_response(
            data={
                "synchronized": created,
                "synced_local_ids": synced_local_ids,
                "failed": failed,
            },
            message="Sincronización procesada correctamente",
            status_code=status.HTTP_200_OK,
        )