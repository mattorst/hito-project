from django.urls import path

from apps.sync.views import SyncAPIView


urlpatterns = [
    path(
        "sync/",
        SyncAPIView.as_view(),
        name="sync",
    ),
]