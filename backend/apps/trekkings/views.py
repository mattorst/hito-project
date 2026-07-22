from datetime import timedelta
from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from apps.trekkings.models import Trekking, TrekkingStatus
from apps.trekkings.serializers import (
    TrekkingSerializer,
    StartTrekkingSerializer,
)


class StartTrekkingAPIView(generics.CreateAPIView):
    serializer_class = StartTrekkingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trail = serializer.validated_data["trail"]
        now = timezone.now()

        # Obtenemos el usuario autenticado o el primero de la base de datos
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = request.user if request.user.is_authenticated else User.objects.first()

        # Calculamos una estimación temporal (+8 horas) requerida por el modelo
        estimated_datetime = now + timedelta(hours=8)

        trekking = Trekking.objects.create(
            user=user,
            trail=trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=now,
            estimated_return_time=estimated_datetime,
        )

        response_serializer = TrekkingSerializer(trekking)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
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