
from django.urls import path

from apps.trekkings.views import (
    StartTrekkingAPIView,
    TrekkingListAPIView,
    TrekkingDetailAPIView,
    FinishTrekkingAPIView,
    CheckpointRecordCreateAPIView,
)

from apps.trekkings.sync_views import (
    OfflineTrekkingBootstrapAPIView,
)

from apps.trekkings.checkpoint_sync import (
    OfflineCheckpointBatchAPIView,
)

from apps.trekkings.tracking_sync import (
    OfflineTrackingBatchAPIView,
)


urlpatterns = [
    # -----------------------------------------------------
    # INICIO ONLINE ORIGINAL
    # -----------------------------------------------------

    path(
        "trekkings/start/",
        StartTrekkingAPIView.as_view(),
        name="start-trekking",
    ),

    # -----------------------------------------------------
    # SINCRONIZACIÓN OFFLINE-FIRST
    # -----------------------------------------------------

    path(
        "trekkings/sync/bootstrap/",
        OfflineTrekkingBootstrapAPIView.as_view(),
        name="offline-trekking-bootstrap",
    ),

    path(
        "trekkings/sync/checkpoints/",
        OfflineCheckpointBatchAPIView.as_view(),
        name="offline-checkpoint-batch",
    ),

    path(
        "trekkings/sync/tracking/",
        OfflineTrackingBatchAPIView.as_view(),
        name="offline-tracking-batch",
    ),

    # -----------------------------------------------------
    # HISTORIAL
    # -----------------------------------------------------

    path(
        "trekkings/",
        TrekkingListAPIView.as_view(),
        name="trekking-list",
    ),

    # -----------------------------------------------------
    # DETALLE DEL TREKKING
    # -----------------------------------------------------

    path(
        "trekkings/<int:pk>/",
        TrekkingDetailAPIView.as_view(),
        name="trekking-detail",
    ),

    # -----------------------------------------------------
    # FINALIZACIÓN ONLINE ORIGINAL
    # -----------------------------------------------------

    path(
        "trekkings/<int:pk>/finish/",
        FinishTrekkingAPIView.as_view(),
        name="finish-trekking",
    ),

    # -----------------------------------------------------
    # CHECKPOINTS ONLINE ORIGINALES
    # -----------------------------------------------------

    path(
        "checkpoint-records/",
        CheckpointRecordCreateAPIView.as_view(),
        name="checkpoint-record-create",
    ),
]
