from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sync.serializers import SyncSerializer


class SyncAPIView(APIView):

    def post(self, request):

        serializer = SyncSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data


        checkpoint_records = data.get(
            "checkpoint_records",
            []
        )

        incidents = data.get(
            "incidents",
            []
        )


        return Response(
            {
                "checkpoint_records_received": len(
                    checkpoint_records
                ),
                "incidents_received": len(
                    incidents
                ),
            },
            status=status.HTTP_200_OK,
        )