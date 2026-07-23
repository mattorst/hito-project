from rest_framework import generics

from apps.incidents.models import Incident
from apps.incidents.serializers import IncidentSerializer


class IncidentCreateAPIView(generics.CreateAPIView):
    """
    Crea reportes de incidentes enviados desde terreno.
    """

    queryset = Incident.objects.all()
    serializer_class = IncidentSerializer