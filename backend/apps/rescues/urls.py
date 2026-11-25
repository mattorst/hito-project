
from django.urls import path

from apps.rescues.sync_views import RescueSyncAPIView

from apps.rescues.views import (
    RescueCreateAPIView,
    ActiveRescueAPIView,
    RescueCompleteAPIView,
    RescueCancelAPIView,
)

urlpatterns = [
    path(
        "rescues/",
        RescueCreateAPIView.as_view(),
        name="rescue-create",
    ),
    path(
        "rescues/active/",
        ActiveRescueAPIView.as_view(),
        name="rescue-active",
    ),
    path(
        "rescues/<int:pk>/complete/",
        RescueCompleteAPIView.as_view(),
        name="rescue-complete",
    ),
    path(
        "rescues/<int:pk>/cancel/",
        RescueCancelAPIView.as_view(),
        name="rescue-cancel",
    ),

    # Sincronización de rescates Offline-First
    path(
        "rescues/sync/",
        RescueSyncAPIView.as_view(),
        name="rescue-sync",
    ),
]
