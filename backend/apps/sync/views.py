from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.trekkings.models import CheckpointRecord
from apps.incidents.models import Incident
from apps.sync.serializers import SyncSerializer
from apps.shared.responses import success_response, error_response


def create_checkpoint_record(data):
    return CheckpointRecord.objects.create(
        **data
    )


def create_incident(data):
    return Incident.objects.create(
        **data
    )


class SyncAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SyncSerializer

    @extend_schema(
        request=SyncSerializer,
        summary="Sincronizar eventos fuera de línea",
        description="Recibe lotes de registros de checkpoints e incidentes creados offline para persistirlos en la base de datos.",
    )
    def post(self, request):
        serializer = SyncSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al procesar la sincronización",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        checkpoint_records_data = data.get(
            "checkpoint_records",
            []
        )

        incidents_data = data.get(
            "incidents",
            []
        )

        created = {
            "checkpoint_records": 0,
            "incidents": 0,
        }
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

        return success_response(
            data={
                "synchronized": created,
                "failed": failed,
            },
            message="Sincronización procesada correctamente",
            status_code=status.HTTP_200_OK,
        )