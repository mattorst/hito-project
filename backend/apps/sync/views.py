from django.db import transaction
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

        created_checkpoint_records = 0
        created_incidents = 0

        with transaction.atomic():

            for checkpoint_data in checkpoint_records_data:
                create_checkpoint_record(checkpoint_data)
                created_checkpoint_records += 1

            for incident_data in incidents_data:
                create_incident(incident_data)
                created_incidents += 1

        return Response(
            {
                "created": {
                    "checkpoint_records": created_checkpoint_records,
                    "incidents": created_incidents,
                }
            },
            status=status.HTTP_201_CREATED,
        )