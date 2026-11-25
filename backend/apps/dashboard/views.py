from datetime import timedelta
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db.models import Count, Exists, OuterRef, Subquery
from django.shortcuts import get_object_or_404, render
from django.urls import reverse_lazy
from django.utils import timezone

from apps.incidents.models import Incident
from apps.parks.models import Checkpoint, Park
from apps.rescues.models import Rescue, RescueStatus
from apps.trekkings.models import (
    CheckpointRecord,
    TrackingPoint,
    Trekking,
    TrekkingStatus,
)
from apps.trekkings.models_checkpoint_sync import OfflineCheckpointEvent
from .forms import StaffLoginForm


class DashboardLoginView(LoginView):
    template_name = "dashboard/login.html"
    authentication_form = StaffLoginForm
    next_page = reverse_lazy("dashboard:home")


def staff_required(view):
    @wraps(view)
    @login_required(login_url="dashboard:login")
    def wrapped(request, *args, **kwargs):
        if not request.user.is_staff or not request.user.is_active:
            raise PermissionDenied("Acceso exclusivo para personal autorizado")
        return view(request, *args, **kwargs)
    return wrapped


def get_checkpoint_expected_events(checkpoint, last_checkpoint_id):
    """Pares esperados para los checkpoints conocidos del MVP.

    Un VIEWPOINT final se trata como cima solo para el esquema actual.
    No se infieren eventos QR a partir de la posición GPS.
    """
    if checkpoint.checkpoint_type == "ENTRY":
        return "CHECK_IN", "CHECK_OUT"
    if checkpoint.checkpoint_type == "EXIT":
        return None, "CHECK_OUT"
    if checkpoint.checkpoint_type == "VIEWPOINT" and checkpoint.pk == last_checkpoint_id:
        return "SUMMIT_ARRIVAL", "SUMMIT_DESCENT"
    return "CHECKPOINT_OUTBOUND", "CHECKPOINT_RETURN"


def build_map_checkpoints(trekking, qr_events):
    trail_checkpoints = list(
        Checkpoint.objects.filter(trail=trekking.trail).order_by("sequence", "pk")
    )
    if not trail_checkpoints:
        return []

    last_checkpoint_id = trail_checkpoints[-1].pk
    events_by_checkpoint = {}
    for event in qr_events:
        events_by_checkpoint.setdefault(event.checkpoint_id, []).append(event)

    result = []
    for checkpoint in trail_checkpoints:
        outbound_type, return_type = get_checkpoint_expected_events(
            checkpoint, last_checkpoint_id
        )
        events = events_by_checkpoint.get(checkpoint.pk, [])
        registered_types = {event.event_type for event in events}
        has_outbound = bool(outbound_type and outbound_type in registered_types)
        has_return = bool(return_type and return_type in registered_types)

        if outbound_type is None:
            status = "COMPLETE" if has_return else "PENDING"
        elif has_outbound and has_return:
            status = "COMPLETE"
        elif has_outbound:
            status = "OUTBOUND"
        elif has_return:
            status = "RETURN"
        else:
            status = "PENDING"

        if checkpoint.latitude is None or checkpoint.longitude is None:
            continue

        result.append({
            "id": checkpoint.pk,
            "name": checkpoint.name,
            "type": checkpoint.checkpoint_type,
            "sequence": checkpoint.sequence,
            "is_summit": (
                checkpoint.checkpoint_type == "VIEWPOINT"
                and checkpoint.pk == last_checkpoint_id
            ),
            "lat": float(checkpoint.latitude),
            "lng": float(checkpoint.longitude),
            "status": status,
            "has_outbound": has_outbound,
            "has_return": has_return,
            "outbound_type": outbound_type,
            "return_type": return_type,
            "events": [
                {
                    "type": event.event_type,
                    "label": event.get_event_type_display(),
                    "occurred_at": timezone.localtime(event.occurred_at).strftime(
                        "%d/%m/%Y %H:%M:%S"
                    ),
                    "received_at": timezone.localtime(event.received_at).strftime(
                        "%d/%m/%Y %H:%M:%S"
                    ),
                }
                for event in events
            ],
        })
    return result


@staff_required
def home(request):
    now = timezone.now()
    active_trekkings = Trekking.objects.filter(status=TrekkingStatus.IN_PROGRESS)
    context = {
        "total_trekkings": Trekking.objects.count(),
        "active_trekkings": active_trekkings.count(),
        "overdue_trekkings": active_trekkings.filter(
            estimated_return_time__lt=now
        ).count(),
        "total_incidents": Incident.objects.count(),
        "active_rescues": Rescue.objects.filter(status=RescueStatus.ACTIVE).count(),
        "latest_trekkings": (
            Trekking.objects.select_related("user", "trail", "trail__park")
            .annotate(companion_count=Count("companions", distinct=True))
            .order_by("-started_at", "-pk")[:12]
        ),
        "latest_incidents": (
            Incident.objects.select_related("trekking", "trekking__user")
            .order_by("-registered_at")[:6]
        ),
        "latest_rescues": (
            Rescue.objects.select_related("trekking", "trekking__user")
            .order_by("-started_at")[:6]
        ),
        "now": now,
    }
    return render(request, "dashboard/home.html", context)


@staff_required
def trekkings(request):
    qs = Trekking.objects.select_related("user", "trail", "trail__park").annotate(
        companion_count=Count("companions", distinct=True)
    )
    status = request.GET.get("status", "")
    valid_statuses = {choice[0] for choice in TrekkingStatus.choices}
    if status in valid_statuses:
        qs = qs.filter(status=status)
    else:
        status = ""
    page = Paginator(qs.order_by("-started_at", "-pk"), 25).get_page(
        request.GET.get("page")
    )
    return render(request, "dashboard/trekkings.html", {
        "page": page,
        "selected_status": status,
        "statuses": TrekkingStatus.choices,
    })


@staff_required
def trekking_detail(request, pk):
    trekking = get_object_or_404(
        Trekking.objects.select_related("user", "trail", "trail__park"), pk=pk
    )
    companions = trekking.companions.all()
    checkpoints = (
        CheckpointRecord.objects.filter(trekking=trekking)
        .select_related("checkpoint").order_by("registered_at", "pk")
    )
    qr_events = list(
        OfflineCheckpointEvent.objects.filter(trekking=trekking)
        .select_related("checkpoint").order_by("occurred_at", "pk")
    )
    map_checkpoints = build_map_checkpoints(trekking, qr_events)
    points = list(
        TrackingPoint.objects.filter(trekking=trekking)
        .order_by("recorded_at", "pk")
        .values("latitude", "longitude", "recorded_at", "accuracy")
    )
    map_points = [
        {
            "lat": float(p["latitude"]),
            "lng": float(p["longitude"]),
            "time": timezone.localtime(p["recorded_at"]).strftime("%d/%m/%Y %H:%M:%S"),
            "accuracy": float(p["accuracy"]) if p["accuracy"] is not None else None,
        }
        for p in points
        if p["latitude"] is not None and p["longitude"] is not None
    ]
    return render(request, "dashboard/trekking_detail.html", {
        "trekking": trekking,
        "companions": companions,
        "checkpoints": checkpoints,
        "qr_events": qr_events,
        "map_checkpoints": map_checkpoints,
        "map_points": map_points,
        "gps_count": len(map_points),
        "route_geojson": trekking.trail.route_geojson,
        "incidents": trekking.incidents.all().order_by("-registered_at"),
        "rescues": trekking.rescues.all().order_by("-started_at"),
    })


@staff_required
def monitoreo(request):
    """Lectura de trekkings activos; no modifica estados ni promete tiempo real."""
    now = timezone.now()
    stale_threshold = now - timedelta(minutes=30)
    active_statuses = [TrekkingStatus.IN_PROGRESS, TrekkingStatus.RESCUE]

    latest_gps = (
        TrackingPoint.objects.filter(trekking_id=OuterRef("pk"))
        .order_by("-recorded_at", "-pk")
    )
    latest_qr = (
        OfflineCheckpointEvent.objects.filter(trekking_id=OuterRef("pk"))
        .order_by("-occurred_at", "-pk")
    )
    active_rescue = Rescue.objects.filter(
        trekking_id=OuterRef("pk"), status=RescueStatus.ACTIVE
    )

    qs = (
        Trekking.objects.filter(status__in=active_statuses)
        .select_related("user", "trail", "trail__park")
        .annotate(
            companion_count=Count("companions", distinct=True),
            last_gps_at=Subquery(latest_gps.values("recorded_at")[:1]),
            last_lat=Subquery(latest_gps.values("latitude")[:1]),
            last_lng=Subquery(latest_gps.values("longitude")[:1]),
            last_accuracy=Subquery(latest_gps.values("accuracy")[:1]),
            last_qr_at=Subquery(latest_qr.values("occurred_at")[:1]),
            last_qr_name=Subquery(latest_qr.values("checkpoint__name")[:1]),
            last_qr_type=Subquery(latest_qr.values("event_type")[:1]),
            has_active_rescue=Exists(active_rescue),
        )
    )

    park_filter = request.GET.get("park", "").strip()
    if park_filter.isdigit():
        qs = qs.filter(trail__park_id=int(park_filter))
    else:
        park_filter = ""

    # El listado se limita a 25 excursiones por página; las cifras resumen
    # se calculan sobre todas las excursiones del parque seleccionado.
    all_rows = list(qs.order_by("-started_at", "-pk"))
    monitoring_rows = []
    map_positions = []
    overdue_count = 0
    active_rescue_count = 0
    stale_count = 0

    for trekking in all_rows:
        overdue = bool(
            trekking.estimated_return_time
            and trekking.estimated_return_time < now
        )
        rescue_alert = bool(
            trekking.has_active_rescue or trekking.status == TrekkingStatus.RESCUE
        )
        has_gps = trekking.last_gps_at is not None
        stale = bool(has_gps and trekking.last_gps_at < stale_threshold)
        no_gps = not has_gps

        if overdue:
            overdue_count += 1
        if rescue_alert:
            active_rescue_count += 1
        if stale or no_gps:
            stale_count += 1

        if rescue_alert:
            priority = "rescue"
            priority_label = "Rescate activo / estado rescate"
        elif overdue:
            priority = "overdue"
            priority_label = "Regreso estimado vencido"
        else:
            priority = "normal"
            priority_label = "Dentro del horario estimado"

        monitoring_rows.append({
            "trekking": trekking,
            "priority": priority,
            "priority_label": priority_label,
            "overdue": overdue,
            "rescue_alert": rescue_alert,
            "gps_stale": stale,
            "gps_missing": no_gps,
        })

        if trekking.last_lat is not None and trekking.last_lng is not None:
            lat = float(trekking.last_lat)
            lng = float(trekking.last_lng)
            if -90 <= lat <= 90 and -180 <= lng <= 180:
                map_positions.append({
                    "id": trekking.pk,
                    "user": trekking.user.username,
                    "trail": trekking.trail.name,
                    "lat": lat,
                    "lng": lng,
                    "at": timezone.localtime(trekking.last_gps_at).strftime(
                        "%d/%m/%Y %H:%M:%S"
                    ) if trekking.last_gps_at else "Sin fecha",
                    "stale": stale,
                    "priority": priority,
                })

    # Solicitudes SOS activas, INDEPENDIENTES del estado del trekking.
    # Una excursión COMPLETED también puede tener un rescate ACTIVE.
    sos_qs = (
        Rescue.objects.filter(status=RescueStatus.ACTIVE)
        .select_related("trekking", "trekking__user", "trekking__trail", "trekking__trail__park")
        .order_by("-started_at", "-pk")
    )
    if park_filter:
        sos_qs = sos_qs.filter(trekking__trail__park_id=int(park_filter))

    sos_positions = []
    active_sos = []
    sos_without_location = 0
    for sos in sos_qs:
        has_location = sos.latitude is not None and sos.longitude is not None
        if has_location:
            lat, lng = float(sos.latitude), float(sos.longitude)
            has_location = -90 <= lat <= 90 and -180 <= lng <= 180
        active_sos.append({"rescue": sos, "has_location": has_location})
        if not has_location:
            sos_without_location += 1
            continue
        sos_positions.append({
            "id": sos.pk,
            "trekking_id": sos.trekking_id,
            "user": sos.trekking.user.username,
            "trail": sos.trekking.trail.name,
            "lat": lat,
            "lng": lng,
            "at": timezone.localtime(sos.started_at).strftime("%d/%m/%Y %H:%M:%S"),
            "trekking_status": sos.trekking.get_status_display(),
        })

    page = Paginator(monitoring_rows, 25).get_page(request.GET.get("page"))
    park_ids = set(
        Trekking.objects.filter(status__in=active_statuses)
        .values_list("trail__park_id", flat=True)
    )
    park_ids.update(
        Rescue.objects.filter(status=RescueStatus.ACTIVE)
        .values_list("trekking__trail__park_id", flat=True)
    )
    parks = Park.objects.filter(pk__in=park_ids).order_by("name")

    return render(request, "dashboard/monitoreo.html", {
        "page": page,
        "parks": parks,
        "park_filter": park_filter,
        "active_count": len(monitoring_rows),
        "overdue_count": overdue_count,
        "active_rescue_count": active_rescue_count,
        "stale_count": stale_count,
        "map_positions": map_positions,
        "sos_positions": sos_positions,
        "active_sos": active_sos,
        "sos_count": len(active_sos),
        "sos_without_location": sos_without_location,
        "now": now,
        "refresh_seconds": 60,
    })


@staff_required
def incidents(request):
    qs = Incident.objects.select_related(
        "trekking", "trekking__user", "trekking__trail"
    ).order_by("-registered_at", "-pk")
    return render(request, "dashboard/incidents.html", {
        "page": Paginator(qs, 25).get_page(request.GET.get("page"))
    })


@staff_required
def rescues(request):
    qs = Rescue.objects.select_related(
        "trekking", "trekking__user", "trekking__trail"
    ).order_by("-started_at", "-pk")
    return render(request, "dashboard/rescues.html", {
        "page": Paginator(qs, 25).get_page(request.GET.get("page"))
    })
