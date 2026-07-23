from django.urls import path

from apps.incidents.views import IncidentCreateAPIView


urlpatterns = [
    path(
        "incidents/",
        IncidentCreateAPIView.as_view(),
        name="incident-create",
    ),
]