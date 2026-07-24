from datetime import timedelta
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from rest_framework.permissions import IsAuthenticated
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
    permission_classes = [IsAuthenticated]
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
        estimated_datetime = now + timedelta(hours=8)

        # Asignación limpia y segura del usuario autenticado
        trekking = Trekking.objects.create(
            user=request.user,
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
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: TrekkingSerializer},
        summary="Finalizar un trekking activo",
    )
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
    permission_classes = [IsAuthenticated]
    serializer_class = CheckpointRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al registrar checkpoint",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_create(serializer)
        return success_response(
            data=serializer.data,
            message="Checkpoint registrado correctamente",
            status_code=status.HTTP_201_CREATED,
        )