from django.urls import path

from apps.parks import views

urlpatterns = [
    path("parks/", views.ParkListAPIView.as_view(), name="park-list"),
    path("parks/<int:pk>/", views.ParkDetailAPIView.as_view(), name="park-detail"),

    path("trails/", views.TrailListAPIView.as_view(), name="trail-list"),
    path("trails/<int:pk>/", views.TrailDetailAPIView.as_view(), name="trail-detail"),

    path(
        "checkpoints/",
        views.CheckpointListAPIView.as_view(),
        name="checkpoint-list",
    ),
    path(
        "checkpoints/<int:pk>/",
        views.CheckpointDetailAPIView.as_view(),
        name="checkpoint-detail",
    ),
]