from django.urls import path

from apps.rescues.views import RescueCreateAPIView


urlpatterns = [
    path(
        "rescues/",
        RescueCreateAPIView.as_view(),
        name="rescue-create",
    ),
]