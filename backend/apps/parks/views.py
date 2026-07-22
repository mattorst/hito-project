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
    serializer_class = TrailSerializer

    def get_queryset(self):
        queryset = Trail.objects.order_by("park__name", "name")
        park_id = self.request.query_params.get("park")

        if park_id:
            queryset = queryset.filter(park_id=park_id)

        return queryset


class TrailDetailAPIView(generics.RetrieveAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailSerializer


class CheckpointListAPIView(generics.ListAPIView):
    serializer_class = CheckpointSerializer

    def get_queryset(self):
        queryset = Checkpoint.objects.order_by("trail__name", "sequence")
        trail_id = self.request.query_params.get("trail")

        if trail_id:
            queryset = queryset.filter(trail_id=trail_id)

        return queryset


class CheckpointDetailAPIView(generics.RetrieveAPIView):
    queryset = Checkpoint.objects.all()
    serializer_class = CheckpointSerializer