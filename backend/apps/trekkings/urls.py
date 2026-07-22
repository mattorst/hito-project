from django.urls import path

from apps.trekkings.views import StartTrekkingAPIView


urlpatterns = [
    path(
        "trekkings/start/",
        StartTrekkingAPIView.as_view(),
        name="start-trekking",
    ),
]