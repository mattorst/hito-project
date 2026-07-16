from django.contrib import admin

from .models import Park, Trail


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