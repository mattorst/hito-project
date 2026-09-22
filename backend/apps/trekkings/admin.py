from django.contrib import admin

from .models import Trekking, CheckpointRecord


@admin.register(Trekking)
class TrekkingAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "trail",
        "status",
        "tracking_enabled",
        "started_at",
        "finished_at",
    )

    list_filter = (
        "status",
        "tracking_enabled",
        "trail__park",
        "trail",
    )

    search_fields = (
        "user__username",
        "trail__name",
        "trail__park__name",
    )

    autocomplete_fields = (
        "user",
        "trail",
    )

    ordering = (
        "-started_at",
    )

@admin.register(CheckpointRecord)
class CheckpointRecordAdmin(admin.ModelAdmin):
    list_display = (
        "trekking",
        "checkpoint",
        "registered_at",
    )

    list_filter = (
        "checkpoint__trail__park",
        "checkpoint__trail",
        "checkpoint",
    )

    search_fields = (
        "trekking__user__username",
        "checkpoint__name",
        "checkpoint__trail__name",
        "checkpoint__trail__park__name",
    )

    autocomplete_fields = (
        "trekking",
        "checkpoint",
    )

    ordering = (
        "registered_at",
    )


from django.contrib import admin
from apps.trekkings.models import (
    Trekking,
    CheckpointRecord,
    TrackingPoint,
)

@admin.register(TrackingPoint)
class TrackingPointAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "local_id",
        "trekking",
        "latitude",
        "longitude",
        "recorded_at",
        "created_at",
    )
    list_filter = (
        "recorded_at",
        "created_at",
    )
    search_fields = (
        "local_id",
        "trekking__user__username",
        "trekking__trail__name",
    )
    autocomplete_fields = (
        "trekking",
    )
    ordering = (
        "-recorded_at",
    )