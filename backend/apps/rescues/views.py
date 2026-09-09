from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from apps.rescues.models import Rescue, RescueStatus
from apps.rescues.serializers import RescueSerializer
from apps.shared.responses import success_response, error_response


class RescueCreateAPIView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Rescue.objects.all()
    serializer_class = RescueSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al registrar rescate",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_create(serializer)

        return success_response(
            data=serializer.data,
            message="Rescate registrado correctamente",
            status_code=status.HTTP_201_CREATED,
        )

    def perform_create(self, serializer):
        serializer.save(
            status=RescueStatus.ACTIVE,
            started_at=timezone.now(),
            finished_at=None,
            closed_reason="",
        )