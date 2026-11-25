
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import (
    get_object_or_404,
    redirect,
    render,
)
from django.utils import timezone

from apps.rescues.models import (
    Rescue,
    RescueStatus,
)
from apps.rescues.models_audit import (
    RescueAuditAction,
    RescueAuditLog,
)

from .rescue_forms import (
    RescueCloseForm,
    RescueNotesForm,
)
from .views import staff_required


@staff_required
def rescue_detail(request, pk):
    """
    Detalle y gestión de una solicitud SOS.

    Operaciones:
    - Consultar la solicitud
    - Guardar observaciones
    - Completar o cancelar el rescate
    - Consultar historial de auditoría

    No modifica el estado del trekking.
    """

    rescue = get_object_or_404(
        Rescue.objects.select_related(
            "trekking",
            "trekking__user",
            "trekking__trail",
            "trekking__trail__park",
        ),
        pk=pk,
    )

    notes_form = RescueNotesForm(
        initial={
            "notes": rescue.notes,
        }
    )

    close_form = RescueCloseForm()

    if request.method == "POST":

        # =====================================
        # VALIDACIÓN DE PERMISOS
        # =====================================
        # Solo personal con autorización para
        # modificar solicitudes de rescate.
        # Los superusuarios conservan el acceso.

        if not request.user.has_perm(
            "rescues.change_rescue"
        ):
            raise PermissionDenied(
                "No tiene permiso para modificar "
                "solicitudes de rescate."
            )

        action = request.POST.get("action")

        if action not in (
            "save_notes",
            "close_rescue",
        ):
            messages.error(
                request,
                "La acción solicitada no es válida.",
            )

            return redirect(
                "dashboard:rescue_detail",
                pk=pk,
            )

        # =====================================
        # GUARDAR OBSERVACIONES
        # =====================================

        if action == "save_notes":
            notes_form = RescueNotesForm(
                request.POST
            )

            if notes_form.is_valid():
                with transaction.atomic():
                    locked = get_object_or_404(
                        Rescue.objects.select_for_update(),
                        pk=pk,
                    )

                    if locked.status != RescueStatus.ACTIVE:
                        messages.error(
                            request,
                            "El rescate ya está cerrado. "
                            "No puede modificarse.",
                        )

                    else:
                        previous_notes = locked.notes or ""

                        new_notes = (
                            notes_form.cleaned_data["notes"]
                        )

                        if previous_notes == new_notes:
                            messages.info(
                                request,
                                "No se detectaron cambios "
                                "en las observaciones.",
                            )

                        else:
                            previous_status = locked.status

                            locked.notes = new_notes
                            locked.save(
                                update_fields=["notes"]
                            )

                            RescueAuditLog.objects.create(
                                rescue=locked,
                                actor=request.user,
                                actor_username=(
                                    request.user.get_username()
                                ),
                                action=(
                                    RescueAuditAction.NOTES_UPDATED
                                ),
                                previous_status=previous_status,
                                new_status=locked.status,
                                previous_notes=previous_notes,
                                new_notes=new_notes,
                            )

                            messages.success(
                                request,
                                "Observaciones guardadas "
                                "y acción registrada "
                                "en la auditoría.",
                            )

                return redirect(
                    "dashboard:rescue_detail",
                    pk=pk,
                )

        # =====================================
        # CERRAR SOLICITUD DE RESCATE
        # =====================================

        elif action == "close_rescue":
            close_form = RescueCloseForm(
                request.POST
            )

            if close_form.is_valid():
                with transaction.atomic():
                    locked = get_object_or_404(
                        Rescue.objects.select_for_update(),
                        pk=pk,
                    )

                    if locked.status != RescueStatus.ACTIVE:
                        messages.error(
                            request,
                            "La solicitud ya fue cerrada. "
                            "No se realizaron cambios.",
                        )

                    else:
                        previous_status = locked.status

                        new_status = (
                            close_form.cleaned_data["status"]
                        )

                        reason = (
                            close_form.cleaned_data[
                                "closed_reason"
                            ]
                        )

                        locked.status = new_status
                        locked.closed_reason = reason
                        locked.finished_at = timezone.now()

                        # Ejecuta validaciones del modelo.
                        locked.save(
                            update_fields=[
                                "status",
                                "closed_reason",
                                "finished_at",
                            ]
                        )

                        if new_status == RescueStatus.COMPLETED:
                            audit_action = (
                                RescueAuditAction.COMPLETED
                            )
                        else:
                            audit_action = (
                                RescueAuditAction.CANCELLED
                            )

                        RescueAuditLog.objects.create(
                            rescue=locked,
                            actor=request.user,
                            actor_username=(
                                request.user.get_username()
                            ),
                            action=audit_action,
                            previous_status=previous_status,
                            new_status=new_status,
                            previous_notes=locked.notes or "",
                            new_notes=locked.notes or "",
                            closed_reason=reason,
                        )

                        messages.success(
                            request,
                            "La solicitud fue cerrada "
                            "y la operación quedó "
                            "registrada en la auditoría.",
                        )

                return redirect(
                    "dashboard:rescue_detail",
                    pk=pk,
                )

    # =====================================
    # POSICIÓN REGISTRADA DEL SOS
    # =====================================

    rescue_position = None

    if (
        rescue.latitude is not None
        and rescue.longitude is not None
    ):
        rescue_position = {
            "lat": float(rescue.latitude),
            "lng": float(rescue.longitude),
            "started_at": timezone.localtime(
                rescue.started_at
            ).strftime("%d/%m/%Y %H:%M:%S"),
            "active": (
                rescue.status == RescueStatus.ACTIVE
            ),
        }

    # =====================================
    # HISTORIAL DE AUDITORÍA
    # =====================================

    audit_logs = (
        RescueAuditLog.objects.filter(
            rescue=rescue
        )
        .select_related("actor")
        .order_by("-created_at", "-id")
    )

    context = {
        "rescue": rescue,
        "notes_form": notes_form,
        "close_form": close_form,
        "rescue_position": rescue_position,
        "is_active": (
            rescue.status == RescueStatus.ACTIVE
        ),
        "audit_logs": audit_logs,
    }

    return render(
        request,
        "dashboard/rescue_detail.html",
        context,
    )
