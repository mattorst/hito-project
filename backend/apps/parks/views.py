from rest_framework import generics

from apps.parks.models import Park, Trail, Checkpoint
from apps.parks.serializers import (
    ParkSerializer,
    TrailSerializer,
    CheckpointSerializer,
)


class ParkListAPIView(generics.ListAPIView):
    queryset = Park.objects.filter(is_active=True).order_by("name")
    serializer_class = ParkSerializer


class ParkDetailAPIView(generics.RetrieveAPIView):
    queryset = Park.objects.filter(is_active=True)
    serializer_class = ParkSerializer


class TrailListAPIView(generics.ListAPIView):
    queryset = Trail.objects.order_by("park__name", "name")
    serializer_class = TrailSerializer


class TrailDetailAPIView(generics.RetrieveAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer


class CheckpointListAPIView(generics.ListAPIView):
    queryset = Checkpoint.objects.order_by("trail__name", "sequence")
    serializer_class = CheckpointSerializer


class CheckpointDetailAPIView(generics.RetrieveAPIView):
    queryset = Checkpoint.objects.all()
    serializer_class = CheckpointSerializer