from django.contrib import admin

from .models import Rescue


@admin.register(Rescue)
class RescueAdmin(admin.ModelAdmin):
    list_display = (
        "trekking",
        "status",
        "started_at",
        "finished_at",
    )

    list_filter = (
        "status",
        "trekking__trail__park",
        "trekking__trail",
    )

    search_fields = (
        "trekking__user__username",
        "trekking__trail__name",
        "trekking__trail__park__name",
        "notes",
        "closed_reason",
    )

    autocomplete_fields = (
        "trekking",
    )

    ordering = (
        "-started_at",
    )