
from django.core.paginator import Paginator
from django.db.models import (
    CharField,
    OuterRef,
    Subquery,
    Value,
)
from django.db.models.functions import Coalesce
from django.shortcuts import render

from apps.incidents.models import Incident
from apps.incidents.models_followup import (
    IncidentFollowUp,
    IncidentReviewStatus,
)
from apps.parks.models import Park

from .views import staff_required


@staff_required
def incidents(request):
    """
    Listado operativo de incidentes.

    Incluye:
    - Filtro por parque
    - Filtro por estado de atención
    - Contadores por estado
    - Paginación

    Los incidentes sin IncidentFollowUp
    se interpretan como PENDING.

    No modifica la información original.
    """

    # =====================================
    # FILTROS
    # =====================================

    park_filter = request.GET.get(
        "park", ""
    ).strip()

    status_filter = request.GET.get(
        "status", ""
    ).strip()

    valid_statuses = {
        IncidentReviewStatus.PENDING,
        IncidentReviewStatus.REVIEWING,
        IncidentReviewStatus.RESOLVED,
    }

    if status_filter not in valid_statuses:
        status_filter = ""

    if not park_filter.isdigit():
        park_filter = ""

    # =====================================
    # ESTADO DE ATENCIÓN
    # =====================================

    followup_status = (
        IncidentFollowUp.objects
        .filter(incident_id=OuterRef("pk"))
        .values("status")[:1]
    )

    queryset = (
        Incident.objects
        .select_related(
            "trekking",
            "trekking__user",
            "trekking__trail",
            "trekking__trail__park",
        )
        .annotate(
            review_status=Coalesce(
                Subquery(
                    followup_status,
                    output_field=CharField(),
                ),
                Value(
                    IncidentReviewStatus.PENDING,
                    output_field=CharField(),
                ),
                output_field=CharField(),
            )
        )
    )

    # =====================================
    # FILTRAR POR PARQUE
    # =====================================

    parks = Park.objects.filter(
        is_active=True
    ).order_by("name")

    if park_filter:
        queryset = queryset.filter(
            trekking__trail__park_id=int(
                park_filter
            )
        )

    # =====================================
    # CONTADORES POR ESTADO
    # Aplican al parque seleccionado,
    # antes del filtro por estado.
    # =====================================

    total_count = queryset.count()

    pending_count = queryset.filter(
        review_status=IncidentReviewStatus.PENDING
    ).count()

    reviewing_count = queryset.filter(
        review_status=IncidentReviewStatus.REVIEWING
    ).count()

    resolved_count = queryset.filter(
        review_status=IncidentReviewStatus.RESOLVED
    ).count()

    # =====================================
    # FILTRAR POR ESTADO
    # =====================================

    if status_filter:
        queryset = queryset.filter(
            review_status=status_filter
        )

    # =====================================
    # ORDEN Y PAGINACIÓN
    # =====================================

    queryset = queryset.order_by(
        "-registered_at",
        "-pk",
    )

    paginator = Paginator(
        queryset,
        25,
    )

    page = paginator.get_page(
        request.GET.get("page")
    )

    context = {
        "page": page,
        "parks": parks,
        "park_filter": park_filter,
        "status_filter": status_filter,
        "total_count": total_count,
        "pending_count": pending_count,
        "reviewing_count": reviewing_count,
        "resolved_count": resolved_count,
    }

    return render(
        request,
        "dashboard/incidents.html",
        context,
    )
