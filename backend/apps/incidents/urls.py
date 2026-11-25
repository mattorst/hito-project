from django.urls import path

from apps.incidents.views import IncidentCreateAPIView

from apps.incidents.sync_views import (
    OfflineIncidentSyncAPIView,
)

urlpatterns = [
    path(
        "incidents/",
        IncidentCreateAPIView.as_view(),
        name="incident-create",
    ),

    path(
    "incidents/sync/",
    OfflineIncidentSyncAPIView.as_view(),
    name="offline-incident-sync",
),

    
]