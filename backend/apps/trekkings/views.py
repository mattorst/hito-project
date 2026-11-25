
from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from django.utils import timezone
from drf_spectacular.utils import extend_schema

from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, status
from rest_framework.views import APIView

from apps.trekkings.models import (
    Trekking,
    TrekkingStatus,
    TrekkingCompanion,
)
from apps.trekkings.serializers import (
    TrekkingSerializer,
    StartTrekkingSerializer,
    CheckpointRecordSerializer,
)
from apps.shared.responses import success_response, error_response



class StartTrekkingAPIView(generics.CreateAPIView):
    """
    Inicio idempotente de trekkings individuales y grupales.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = StartTrekkingSerializer

    @staticmethod
    def same_request(trekking, trail, companions_data):
        """
        Comprueba que un UUID reutilizado corresponda
        a los mismos datos del inicio original.
        """

        if trekking.trail_id != trail.pk:
            return False

        existing_companions = list(
            trekking.companions.order_by("id")
        )

        if len(existing_companions) != len(companions_data):
            return False

        fields = (
            "first_name",
            "last_name",
            "sex",
            "emergency_contact_name",
            "emergency_contact_phone",
        )

        for existing, incoming in zip(
            existing_companions,
            companions_data,
        ):
            supplied_id = incoming.get("local_id")

            if (
                supplied_id is not None
                and existing.local_id != supplied_id
            ):
                return False

            for field in fields:
                original_value = getattr(existing, field)
                supplied_value = incoming.get(field, "")

                if isinstance(supplied_value, str):
                    supplied_value = supplied_value.strip()

                if original_value != supplied_value:
                    return False

        return True

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return error_response(
                errors=serializer.errors,
                message="Error al iniciar trekking",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        trail = serializer.validated_data["trail"]
        local_id = serializer.validated_data.get("local_id")
        companions_data = serializer.validated_data.get(
            "companions", []
        )

        def existing_response(existing):
            if existing.user_id != request.user.pk:
                return error_response(
                    message="El identificador ya está en uso.",
                    status_code=status.HTTP_409_CONFLICT,
                )

            if not self.same_request(
                existing,
                trail,
                companions_data,
            ):
                return error_response(
                    message=(
                        "El identificador pertenece a un "
                        "trekking con datos diferentes."
                    ),
                    status_code=status.HTTP_409_CONFLICT,
                )

            return success_response(
                data=TrekkingSerializer(existing).data,
                message="Trekking recuperado correctamente",
                status_code=status.HTTP_200_OK,
            )

        # Primer filtro: un UUID ya registrado.
        if local_id is not None:
            existing = (
                Trekking.objects
                .prefetch_related("companions")
                .filter(local_id=local_id)
                .first()
            )

            if existing:
                return existing_response(existing)

        now = timezone.now()
        estimated_datetime = now + timedelta(hours=8)

        try:
            with transaction.atomic():

                # Evitar reutilizar un UUID de acompañante
                # registrado en otra excursión.
                companion_ids = [
                    companion["local_id"]
                    for companion in companions_data
                    if companion.get("local_id") is not None
                ]

                if companion_ids:
                    duplicated = (
                        TrekkingCompanion.objects
                        .filter(local_id__in=companion_ids)
                        .exists()
                    )

                    if duplicated:
                        return error_response(
                            message=(
                                "Un identificador de acompañante "
                                "ya está registrado."
                            ),
                            status_code=status.HTTP_409_CONFLICT,
                        )

                trekking = Trekking.objects.create(
                    local_id=local_id,
                    user=request.user,
                    trail=trail,
                    status=TrekkingStatus.IN_PROGRESS,
                    started_at=now,
                    estimated_return_time=estimated_datetime,
                )

                for companion_data in companions_data:
                    TrekkingCompanion.objects.create(
                        trekking=trekking,
                        **{
                            **companion_data,
                            "first_name": companion_data[
                                "first_name"
                            ].strip(),
                            "last_name": companion_data[
                                "last_name"
                            ].strip(),
                            "emergency_contact_name":
                                companion_data[
                                    "emergency_contact_name"
                                ].strip(),
                            "emergency_contact_phone":
                                companion_data[
                                    "emergency_contact_phone"
                                ].strip(),
                        },
                    )

        except (IntegrityError, DjangoValidationError):
            # Una solicitud concurrente pudo crear
            # exactamente el mismo UUID mientras
            # procesábamos esta petición.
            existing = (
                Trekking.objects
                .prefetch_related("companions")
                .filter(local_id=local_id)
                .first()
                if local_id is not None
                else None
            )

            if existing:
                return existing_response(existing)

            return error_response(
                message=(
                    "No fue posible crear el trekking. "
                    "Revisa los datos y sus identificadores."
                ),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = TrekkingSerializer(trekking)

        return success_response(
            data=response_serializer.data,
            message="Trekking iniciado correctamente",
            status_code=status.HTTP_201_CREATED,
        )


class TrekkingListAPIView(APIView):
    """
    Lista los trekkings del usuario autenticado.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TrekkingSerializer(many=True)},
        summary="Listar historial de trekkings del usuario",
    )
    def get(self, request):
        trekkings = (
            Trekking.objects
            .filter(user=request.user)
            .select_related("trail")
            .prefetch_related("companions")
            .order_by("-started_at")
        )

        serializer = TrekkingSerializer(trekkings, many=True)

        return success_response(
            data=serializer.data,
            message="Historial de trekkings obtenido correctamente",
        )


class TrekkingDetailAPIView(APIView):
    """
    Obtiene el detalle de un trekking específico
    perteneciente al usuario autenticado.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TrekkingSerializer},
        summary="Obtener detalle de un trekking por ID",
    )
    def get(self, request, pk):
        try:
            trekking = (
                Trekking.objects
                .select_related("trail")
                .prefetch_related("companions")
                .get(pk=pk, user=request.user)
            )
        except Trekking.DoesNotExist:
            return error_response(
                message="Trekking no encontrado o no autorizado.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = TrekkingSerializer(trekking)

        return success_response(
            data=serializer.data,
            message="Detalle de trekking obtenido correctamente",
        )


class FinishTrekkingAPIView(APIView):
    """
    Finaliza un trekking activo del usuario autenticado.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: TrekkingSerializer},
        summary="Finalizar un trekking activo",
    )
    def post(self, request, pk):
        try:
            trekking = Trekking.objects.get(
                pk=pk,
                user=request.user,
            )
        except Trekking.DoesNotExist:
            return error_response(
                message="Trekking no encontrado o no autorizado.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if trekking.status != TrekkingStatus.IN_PROGRESS:
            return error_response(
                message="El trekking no está en progreso.",
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

    Solo permite registrar checkpoints en trekkings
    pertenecientes al usuario autenticado.
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

        trekking = serializer.validated_data["trekking"]

        if trekking.user_id != request.user.pk:
            return error_response(
                message="No tienes permiso para registrar este checkpoint.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        if trekking.status != TrekkingStatus.IN_PROGRESS:
            return error_response(
                message="El trekking no está en progreso.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_create(serializer)

        return success_response(
            data=serializer.data,
            message="Checkpoint registrado correctamente",
            status_code=status.HTTP_201_CREATED,
        )
