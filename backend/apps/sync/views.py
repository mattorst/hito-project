from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.trekkings.models import CheckpointRecord
from apps.incidents.models import Incident
from apps.sync.serializers import SyncSerializer


def create_checkpoint_record(data):
    return CheckpointRecord.objects.create(
        **data
    )


def create_incident(data):
    return Incident.objects.create(
        **data
    )


class SyncAPIView(APIView):

    def post(self, request):

        serializer = SyncSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
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

        return Response(
            {
                "synchronized": created,
                "failed": failed,
            },
            status=status.HTTP_200_OK,
        )