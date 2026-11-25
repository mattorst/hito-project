
from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone


from apps.incidents.models import Incident, IncidentType
from apps.incidents.models_followup import (
    IncidentFollowUp,
    IncidentReviewStatus,
    IncidentAuditLog,
)


from apps.parks.models import Park, Trail
from apps.trekkings.models import Trekking, TrekkingStatus
from apps.rescues.models import Rescue, RescueStatus
from apps.rescues.models_audit import (
    RescueAuditLog,
    RescueAuditAction,
)

User = get_user_model()


class RescueDashboardPermissionTests(TestCase):

    def setUp(self):
        self.url = reverse(
            "dashboard:rescue_detail",
            kwargs={"pk": 999999},
        )

        self.hiker = User.objects.create_user(
            username="hiker_test",
            password="test-password-123",
            is_staff=False,
        )

    def test_anonymous_user_is_redirected_to_login(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url.split("?")[0],
            reverse("dashboard:login"),
        )

    def test_hiker_cannot_access_rescue_dashboard(self):
        self.client.force_login(self.hiker)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_staff_user_can_access_rescue_dashboard(self):
        staff_user = User.objects.create_user(
            username="staff_test",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        self.client.force_login(staff_user)

        response = self.client.get(
            reverse("dashboard:rescues")
        )

        self.assertEqual(response.status_code, 200)


class RescueDashboardCancellationTests(TestCase):

    def setUp(self):
        self.staff = User.objects.create_user(
            username="guardaparque_test",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        # =====================================
        # CONFIGURACIÓN DE PERMISOS DE PRUEBA
        # =====================================
        # Las bases de datos de pruebas son
        # independientes de la base principal.
        # Por eso creamos el grupo y asignamos
        # el permiso necesario en este setUp.

        guardaparque_group, _ = Group.objects.get_or_create(
            name="Guardaparque"
        )

        rescue_permission = Permission.objects.get(
            content_type__app_label="rescues",
            codename="change_rescue",
        )

        guardaparque_group.permissions.add(
            rescue_permission
        )

        self.staff.groups.add(
            guardaparque_group
        )

        self.hiker = User.objects.create_user(
            username="excursionista_sos_test",
            password="test-password-123",
        )

        self.park = Park.objects.create(
            name="Parque SOS de Prueba",
            description="Parque para probar la cancelación",
            region="Región del Maule",
            latitude=Decimal("-35.440270"),
            longitude=Decimal("-71.639506"),
            default_return_time=time(18, 0),
        )

        self.trail = Trail.objects.create(
            park=self.park,
            name="Sendero SOS de Prueba",
            distance_km=5,
            estimated_duration=timedelta(hours=3),
            max_altitude=1200,
        )

        now = timezone.now()

        self.trekking = Trekking.objects.create(
            user=self.hiker,
            trail=self.trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=now - timedelta(hours=2),
            estimated_return_time=now + timedelta(hours=3),
        )

        self.rescue = Rescue.objects.create(
            trekking=self.trekking,
            status=RescueStatus.ACTIVE,
            started_at=now - timedelta(minutes=30),
            notes="Solicitud SOS de prueba",
            closed_reason="",
        )

        self.url = reverse(
            "dashboard:rescue_detail",
            kwargs={"pk": self.rescue.pk},
        )

        self.client.force_login(self.staff)

    # =====================================
    # PERMISOS DEL GUARDAPARQUE
    # =====================================

    def test_guardaparque_has_rescue_change_permission(self):
        self.assertTrue(
            self.staff.has_perm(
                "rescues.change_rescue"
            )
        )

    # =====================================
    # CANCELACIÓN Y AUDITORÍA
    # =====================================

    def test_cancel_rescue_creates_audit_log(self):
        reason = "Cancelación de prueba: falsa alarma."

        response = self.client.post(
            self.url,
            {
                "action": "close_rescue",
                "status": RescueStatus.CANCELLED,
                "closed_reason": reason,
            },
        )

        self.assertRedirects(
            response,
            self.url,
            fetch_redirect_response=False,
        )

        self.rescue.refresh_from_db()
        self.trekking.refresh_from_db()

        self.assertEqual(
            self.rescue.status,
            RescueStatus.CANCELLED,
        )
        self.assertIsNotNone(self.rescue.finished_at)
        self.assertEqual(
            self.rescue.closed_reason,
            reason,
        )

        self.assertEqual(
            self.trekking.status,
            TrekkingStatus.IN_PROGRESS,
        )

        self.assertEqual(
            RescueAuditLog.objects.filter(
                rescue=self.rescue
            ).count(),
            1,
        )

        audit = RescueAuditLog.objects.get(
            rescue=self.rescue
        )

        self.assertEqual(
            audit.action,
            RescueAuditAction.CANCELLED,
        )
        self.assertEqual(
            audit.previous_status,
            RescueStatus.ACTIVE,
        )
        self.assertEqual(
            audit.new_status,
            RescueStatus.CANCELLED,
        )
        self.assertEqual(
            audit.actor,
            self.staff,
        )
        self.assertEqual(
            audit.actor_username,
            self.staff.username,
        )
        self.assertEqual(
            audit.closed_reason,
            reason,
        )

    def test_cancelled_rescue_cannot_be_closed_again(self):
        reason = "Primera cancelación de prueba."

        # Primer cierre: válido.
        self.client.post(
            self.url,
            {
                "action": "close_rescue",
                "status": RescueStatus.CANCELLED,
                "closed_reason": reason,
            },
        )

        self.rescue.refresh_from_db()

        self.assertEqual(
            self.rescue.status,
            RescueStatus.CANCELLED,
        )

        self.assertEqual(
            RescueAuditLog.objects.filter(
                rescue=self.rescue
            ).count(),
            1,
        )

        original_finished_at = self.rescue.finished_at

        # Segundo cierre: debe rechazarse.
        response = self.client.post(
            self.url,
            {
                "action": "close_rescue",
                "status": RescueStatus.COMPLETED,
                "closed_reason": "Intento de segundo cierre.",
            },
        )

        self.assertEqual(response.status_code, 302)

        self.rescue.refresh_from_db()

        # El estado y los datos originales se conservan.
        self.assertEqual(
            self.rescue.status,
            RescueStatus.CANCELLED,
        )
        self.assertEqual(
            self.rescue.closed_reason,
            reason,
        )
        self.assertEqual(
            self.rescue.finished_at,
            original_finished_at,
        )

        # No debe registrarse una segunda auditoría.
        self.assertEqual(
            RescueAuditLog.objects.filter(
                rescue=self.rescue
            ).count(),
            1,
        )

    def test_closed_rescue_notes_cannot_be_modified(self):
        original_notes = self.rescue.notes

        # Cerrar el rescate.
        self.client.post(
            self.url,
            {
                "action": "close_rescue",
                "status": RescueStatus.CANCELLED,
                "closed_reason": "Cancelación por falsa alarma.",
            },
        )

        self.rescue.refresh_from_db()

        self.assertEqual(
            self.rescue.status,
            RescueStatus.CANCELLED,
        )

        # Intentar modificar observaciones después del cierre.
        response = self.client.post(
            self.url,
            {
                "action": "save_notes",
                "notes": "Observaciones modificadas indebidamente.",
            },
        )

        self.assertEqual(response.status_code, 302)

        self.rescue.refresh_from_db()

        # Las observaciones originales deben conservarse.
        self.assertEqual(
            self.rescue.notes,
            original_notes,
        )

        # Solo debe existir la auditoría del cierre.
        self.assertEqual(
            RescueAuditLog.objects.filter(
                rescue=self.rescue
            ).count(),
            1,
        )

    # =====================================
    # PRUEBAS DE PERMISOS INSUFICIENTES
    # =====================================

    def test_staff_without_permission_can_view_rescue(self):
        unauthorized_staff = User.objects.create_user(
            username="staff_readonly_test",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        self.client.force_login(
            unauthorized_staff
        )

        response = self.client.get(
            self.url
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_staff_without_permission_cannot_modify_notes(self):
        unauthorized_staff = User.objects.create_user(
            username="staff_no_notes_permission",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        self.client.force_login(
            unauthorized_staff
        )

        original_notes = self.rescue.notes

        response = self.client.post(
            self.url,
            {
                "action": "save_notes",
                "notes": "Cambio no autorizado.",
            },
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        self.rescue.refresh_from_db()

        self.assertEqual(
            self.rescue.notes,
            original_notes,
        )

        self.assertEqual(
            RescueAuditLog.objects.filter(
                rescue=self.rescue
            ).count(),
            0,
        )

    def test_staff_without_permission_cannot_close_rescue(self):
        unauthorized_staff = User.objects.create_user(
            username="staff_no_close_permission",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        self.client.force_login(
            unauthorized_staff
        )

        response = self.client.post(
            self.url,
            {
                "action": "close_rescue",
                "status": RescueStatus.CANCELLED,
                "closed_reason": "Intento no autorizado.",
            },
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        self.rescue.refresh_from_db()

        self.assertEqual(
            self.rescue.status,
            RescueStatus.ACTIVE,
        )

        self.assertIsNone(
            self.rescue.finished_at
        )

        self.assertEqual(
            self.rescue.closed_reason,
            "",
        )

        self.assertEqual(
            RescueAuditLog.objects.filter(
                rescue=self.rescue
            ).count(),
            0,
        )



class IncidentDashboardPermissionTests(TestCase):
    """
    Verifica los permisos de escritura
    del seguimiento de incidentes en el dashboard.
    """

    def setUp(self):
        self.hiker = User.objects.create_user(
            username="hiker_incident_dashboard",
            password="test-password-123",
        )

        self.guardaparque = User.objects.create_user(
            username="guardaparque_incident_dashboard",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        self.staff_without_permission = User.objects.create_user(
            username="staff_incident_readonly",
            password="test-password-123",
            is_staff=True,
            is_active=True,
        )

        group, _ = Group.objects.get_or_create(
            name="Guardaparque"
        )

        permission = Permission.objects.get(
            content_type__app_label="incidents",
            codename="change_incidentfollowup",
        )

        group.permissions.add(permission)
        self.guardaparque.groups.add(group)

        self.park = Park.objects.create(
            name="Parque para incidentes del dashboard",
            description="Pruebas de permisos",
            region="Región del Maule",
            latitude=Decimal("-35.440270"),
            longitude=Decimal("-71.639506"),
            default_return_time=time(18, 0),
        )

        self.trail = Trail.objects.create(
            park=self.park,
            name="Sendero para incidentes",
            distance_km=5,
            estimated_duration=timedelta(hours=3),
            max_altitude=1200,
        )

        now = timezone.now()

        self.trekking = Trekking.objects.create(
            user=self.hiker,
            trail=self.trail,
            status=TrekkingStatus.IN_PROGRESS,
            started_at=now - timedelta(hours=1),
            estimated_return_time=now + timedelta(hours=3),
        )

        self.incident = Incident.objects.create(
            trekking=self.trekking,
            incident_type=IncidentType.OTHER,
            description="Incidente para probar permisos.",
            latitude=Decimal("-35.440270"),
            longitude=Decimal("-71.639506"),
            registered_at=now,
        )

        self.url = reverse(
            "dashboard:incident_detail",
            kwargs={"pk": self.incident.pk},
        )

    def test_guardaparque_can_update_incident_followup(self):
        self.client.force_login(self.guardaparque)

        response = self.client.post(
            self.url,
            {
                "status": IncidentReviewStatus.REVIEWING,
                "notes": "Incidente en revisión.",
            },
        )

        self.assertRedirects(
            response,
            self.url,
            fetch_redirect_response=False,
        )

        follow_up = IncidentFollowUp.objects.get(
            incident=self.incident
        )

        self.assertEqual(
            follow_up.status,
            IncidentReviewStatus.REVIEWING,
        )

        self.assertEqual(
            follow_up.notes,
            "Incidente en revisión.",
        )

        self.assertEqual(
            follow_up.updated_by,
            self.guardaparque,
        )

        self.assertEqual(
            IncidentAuditLog.objects.filter(
                incident=self.incident
            ).count(),
            1,
        )

        self.incident.refresh_from_db()

        self.assertEqual(
            self.incident.description,
            "Incidente para probar permisos.",
        )

    def test_staff_without_permission_can_view_incident(self):
        self.client.force_login(
            self.staff_without_permission
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_staff_without_permission_cannot_update_incident(self):
        self.client.force_login(
            self.staff_without_permission
        )

        response = self.client.post(
            self.url,
            {
                "status": IncidentReviewStatus.RESOLVED,
                "notes": "Cambio no autorizado.",
            },
        )

        self.assertEqual(
            response.status_code,
            403,
        )

        self.assertFalse(
            IncidentFollowUp.objects.filter(
                incident=self.incident
            ).exists()
        )

        self.assertEqual(
            IncidentAuditLog.objects.filter(
                incident=self.incident
            ).count(),
            0,
        )

        self.incident.refresh_from_db()

        self.assertEqual(
            self.incident.description,
            "Incidente para probar permisos.",
        )
