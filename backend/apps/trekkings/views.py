from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import generics, status
from rest_framework.views import APIView

from apps.trekkings.models import Trekking, TrekkingStatus
from apps.trekkings.serializers import (
    TrekkingSerializer,
    StartTrekkingSerializer,
    CheckpointRecordSerializer,
)
from apps.shared.responses import success_response, error_response


class StartTrekkingAPIView(generics.CreateAPIView):
    serializer_class = StartTrekkingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al iniciar trekking",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        trail = serializer.validated_data["trail"]
        now = timezone.now()

        User = get_user_model()
        user = request.user if request.user.is_authenticated else User.objects.first()

        estimated_datetime = now + timedelta(hours=8)

        trekking = Trekking.objects.create(
            user=user,
            trail=trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=now,
            estimated_return_time=estimated_datetime,
        )

        response_serializer = TrekkingSerializer(trekking)

        return success_response(
            data=response_serializer.data,
            message="Trekking iniciado correctamente",
            status_code=status.HTTP_201_CREATED,
        )


class TrekkingListAPIView(generics.ListAPIView):
    """
    Lista los trekkings registrados.
    """

    serializer_class = TrekkingSerializer

    def get_queryset(self):
        return (
            Trekking.objects
            .select_related("trail")
            .order_by("-started_at")
        )


class FinishTrekkingAPIView(APIView):
    """
    Finaliza un trekking activo.
    """

    def post(self, request, pk):
        try:
            trekking = Trekking.objects.get(pk=pk)
        except Trekking.DoesNotExist:
            return error_response(
                message="Trekking no encontrado.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if trekking.status == TrekkingStatus.COMPLETED:
            return error_response(
                message="El trekking ya está finalizado.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        trekking.status = TrekkingStatus.COMPLETED
        trekking.finished_at = timezone.now()
        trekking.save()

        serializer = TrekkingSerializer(trekking)

        return success_response(
            data=serializer.data,
            message="Trekking finalizado correctamente",
            status_code=status.HTTP_200_OK,
        )


class CheckpointRecordCreateAPIView(generics.CreateAPIView):
    """
    Registra un checkpoint alcanzado durante un trekking.
    """

    serializer_class = CheckpointRecordSerializer