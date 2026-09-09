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


class ActiveRescueAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RescueSerializer

    def get(self, request, *args, **kwargs):
        trekking_id = request.query_params.get("trekking")

        if not trekking_id:
            return error_response(
                errors={"trekking": ["Este parámetro es obligatorio."]},
                message="Trekking no especificado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        rescue = Rescue.objects.filter(
            trekking_id=trekking_id,
            trekking__user=request.user,
            status=RescueStatus.ACTIVE,
        ).first()

        if rescue is None:
            return success_response(
                data=None,
                message="No existe un rescate activo.",
                status_code=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(rescue)

        return success_response(
            data=serializer.data,
            message="Rescate activo obtenido correctamente",
            status_code=status.HTTP_200_OK,
        )


class RescueCompleteAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Rescue.objects.all()
    serializer_class = RescueSerializer

    def post(self, request, pk):
        rescue = self.get_object()

        if rescue.trekking.user_id != request.user.id:
            return error_response(
                errors={
                    "rescue": [
                        "El rescate no pertenece al usuario autenticado."
                    ]
                },
                message="No autorizado",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        if rescue.status != RescueStatus.ACTIVE:
            return error_response(
                errors={
                    "status": [
                        "El rescate no está activo."
                    ]
                },
                message="No se puede cerrar el rescate",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        rescue.status = RescueStatus.COMPLETED
        rescue.finished_at = timezone.now()
        rescue.closed_reason = "Rescate cerrado por el excursionista."
        rescue.save()

        serializer = self.get_serializer(rescue)

        return success_response(
            data=serializer.data,
            message="Rescate cerrado correctamente",
            status_code=status.HTTP_200_OK,
        )


class RescueCancelAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Rescue.objects.all()
    serializer_class = RescueSerializer

    def post(self, request, pk):
        rescue = self.get_object()

        if rescue.trekking.user_id != request.user.id:
            return error_response(
                errors={
                    "rescue": [
                        "El rescate no pertenece al usuario autenticado."
                    ]
                },
                message="No autorizado",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        if rescue.status != RescueStatus.ACTIVE:
            return error_response(
                errors={
                    "status": [
                        "El rescate no está activo."
                    ]
                },
                message="No se puede cancelar el rescate",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        rescue.status = RescueStatus.CANCELLED
        rescue.finished_at = timezone.now()
        rescue.closed_reason = "Rescate cancelado por el excursionista."
        rescue.save()

        serializer = self.get_serializer(rescue)

        return success_response(
            data=serializer.data,
            message="Rescate cancelado correctamente",
            status_code=status.HTTP_200_OK,
        )