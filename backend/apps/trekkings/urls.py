from django.urls import path

from apps.trekkings.views import (
    StartTrekkingAPIView,
    TrekkingListAPIView,
)


urlpatterns = [
    path(
        "trekkings/start/",
        StartTrekkingAPIView.as_view(),
        name="start-trekking",
    ),

    path(
        "trekkings/",
        TrekkingListAPIView.as_view(),
        name="trekking-list",
    ),
]