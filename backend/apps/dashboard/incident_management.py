
import mimetypes
import os

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import (
    FileResponse,
    Http404,
    HttpResponse,
)
from django.shortcuts import (
    get_object_or_404,
    redirect,
    render,
)

from apps.incidents.models import Incident
from apps.incidents.models_followup import (
    IncidentAuditLog,
    IncidentFollowUp,
    IncidentReviewStatus,
)

from .incident_forms import IncidentFollowUpForm
from .views import staff_required


@staff_required
def incident_detail(request, pk):
    """
    Detalle del reporte y seguimiento operativo.

    El incidente original no se modifica.
    Solo se actualiza IncidentFollowUp
    y se registra IncidentAuditLog.
    """

    incident = get_object_or_404(
        Incident.objects.select_related(
            "trekking",
            "trekking__user",
            "trekking__trail",
            "trekking__trail__park",
        ),
        pk=pk,
    )

    follow_up = IncidentFollowUp.objects.filter(
        incident_id=pk
    ).first()

    current_status = (
        follow_up.status
        if follow_up
        else IncidentReviewStatus.PENDING
    )

    form = IncidentFollowUpForm(
        initial={
            "status": current_status,
            "notes": (
                follow_up.notes
                if follow_up
                else ""
            ),
        }
    )

    if request.method == "POST":

        # =====================================
        # VALIDACIÓN DE PERMISOS
        # =====================================
        # Solo personal con autorización para
        # modificar seguimientos de incidentes.
        # Los superusuarios conservan el acceso.

        if not request.user.has_perm(
            "incidents.change_incidentfollowup"
        ):
            raise PermissionDenied(
                "No tiene permiso para modificar "
                "el seguimiento de incidentes."
            )

        form = IncidentFollowUpForm(request.POST)

        if form.is_valid():
            new_status = form.cleaned_data["status"]
            new_notes = form.cleaned_data["notes"]

            changed = False

            with transaction.atomic():

                # Se bloquea la fila del incidente,
                # incluso si aún no existe seguimiento.
                # Así se serializa su creación.
                locked_incident = get_object_or_404(
                    Incident.objects.select_for_update(),
                    pk=pk,
                )

                follow_up, _ = (
                    IncidentFollowUp.objects.get_or_create(
                        incident=locked_incident,
                    )
                )

                previous_status = follow_up.status
                previous_notes = follow_up.notes or ""

                changed = (
                    previous_status != new_status
                    or previous_notes != new_notes
                )

                if changed:
                    follow_up.status = new_status
                    follow_up.notes = new_notes
                    follow_up.updated_by = request.user

                    follow_up.save(
                        update_fields=[
                            "status",
                            "notes",
                            "updated_by",
                            "updated_at",
                        ]
                    )

                    IncidentAuditLog.objects.create(
                        incident=locked_incident,
                        actor=request.user,
                        actor_username=(
                            request.user.get_username()
                        ),
                        previous_status=previous_status,
                        new_status=new_status,
                        previous_notes=previous_notes,
                        new_notes=new_notes,
                    )

            if changed:
                messages.success(
                    request,
                    "Seguimiento guardado y "
                    "registrado en la auditoría.",
                )
            else:
                messages.info(
                    request,
                    "No se detectaron cambios.",
                )

            return redirect(
                "dashboard:incident_detail",
                pk=pk,
            )

    # Refrescar el seguimiento si se guardó.
    follow_up = IncidentFollowUp.objects.filter(
        incident_id=pk
    ).select_related("updated_by").first()

    current_status = (
        follow_up.status
        if follow_up
        else IncidentReviewStatus.PENDING
    )

    incident_position = None

    if (
        incident.latitude is not None
        and incident.longitude is not None
    ):
        incident_position = {
            "lat": float(incident.latitude),
            "lng": float(incident.longitude),
            "type": incident.get_incident_type_display(),
            "at": incident.registered_at.isoformat(),
        }

    audit_logs = (
        IncidentAuditLog.objects.filter(
            incident_id=pk
        )
        .select_related("actor")
        .order_by("-created_at", "-id")
    )

    context = {
        "incident": incident,
        "follow_up": follow_up,
        "current_status": current_status,
        "form": form,
        "incident_position": incident_position,
        "audit_logs": audit_logs,
    }

    return render(
        request,
        "dashboard/incident_detail.html",
        context,
    )


@staff_required
def incident_photo(request, pk):
    """
    Entrega la fotografía exclusivamente
    mediante una vista que exige autenticación
    y pertenencia al personal autorizado.

    IMPORTANTE:
    La protección es efectiva solamente
    si MEDIA_URL o el almacenamiento físico
    no exponen otra URL pública al mismo archivo.
    """

    incident = get_object_or_404(
        Incident,
        pk=pk,
    )

    if not incident.photo:
        raise Http404("Sin fotografía registrada.")

    extension = os.path.splitext(
        incident.photo.name
    )[1].lower()

    allowed_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }

    content_type = allowed_types.get(extension)

    if content_type is None:
        raise Http404(
            "Formato no disponible para visualización."
        )

    try:
        image_file = incident.photo.open("rb")
    except (OSError, FileNotFoundError):
        raise Http404(
            "El archivo no está disponible."
        )

    response = FileResponse(
        image_file,
        content_type=content_type,
    )

    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = (
        "default-src 'none'; sandbox"
    )
    response["Content-Disposition"] = (
        'inline; filename="incidente-imagen"'
    )

    return response
