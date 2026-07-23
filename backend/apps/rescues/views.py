from rest_framework import generics

from apps.rescues.models import Rescue
from apps.rescues.serializers import RescueSerializer


class RescueCreateAPIView(generics.CreateAPIView):
    """
    Crea una operación de rescate.
    """

    queryset = Rescue.objects.all()
    serializer_class = RescueSerializer