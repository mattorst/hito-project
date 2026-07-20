from django.contrib import admin

from .models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = (
        "incident_type",
        "trekking",
        "registered_at",
    )

    list_filter = (
        "incident_type",
        "trekking__trail__park",
        "trekking__trail",
    )

    search_fields = (
        "trekking__user__username",
        "trekking__trail__name",
        "trekking__trail__park__name",
        "description",
    )

    autocomplete_fields = (
        "trekking",
    )

    ordering = (
        "-registered_at",
    )