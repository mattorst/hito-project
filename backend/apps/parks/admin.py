from django.contrib import admin

from .models import Park, Trail, Checkpoint


@admin.register(Park)
class ParkAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "region",
        "default_return_time",
        "is_active",
    )

    list_filter = (
        "region",
        "is_active",
    )

    search_fields = (
        "name",
        "region",
    )

    ordering = (
        "name",
    )
    


@admin.register(Trail)
class TrailAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "park",
        "difficulty",
        "status",
        "distance_km",
        "is_active",
    )

    list_filter = (
        "park",
        "difficulty",
        "status",
        "is_active",
    )

    search_fields = (
        "name",
        "park__name",
    )

    autocomplete_fields = (
        "park",
    )

    ordering = (
        "park",
        "name",
    )

@admin.register(Checkpoint)
class CheckpointAdmin(admin.ModelAdmin):
    list_display = (
        "sequence",
        "name",
        "trail",
        "checkpoint_type",
        "is_active",
    )

    list_filter = (
        "checkpoint_type",
        "is_active",
        "trail__park",
        "trail",
    )

    search_fields = (
        "name",
        "qr_identifier",
        "trail__name",
        "trail__park__name",
    )

    autocomplete_fields = (
        "trail",
    )

    ordering = (
        "trail",
        "sequence",
    )