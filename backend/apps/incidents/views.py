from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from apps.incidents.models import Incident
from apps.incidents.serializers import IncidentSerializer
from apps.shared.responses import error_response, success_response


class IncidentCreateAPIView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    """
    Registra un nuevo incidente durante un trekking.
    """

    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al reportar incidente",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_create(serializer)
        return success_response(
            data=serializer.data,
            message="Incidente reportado correctamente",
            status_code=status.HTTP_201_CREATED,
        )