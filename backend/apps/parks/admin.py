from django.contrib import admin

from .models import Park


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