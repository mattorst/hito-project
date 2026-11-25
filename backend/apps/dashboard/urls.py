
from django.contrib.auth.views import LogoutView
from django.urls import path

from . import views
from . import rescue_management
from . import incident_management
from . import incident_listing


app_name = "dashboard"


urlpatterns = [
    # =====================================
    # DASHBOARD Y AUTENTICACIÓN
    # =====================================

    path(
        "",
        views.home,
        name="home",
    ),

    path(
        "login/",
        views.DashboardLoginView.as_view(),
        name="login",
    ),

    path(
        "logout/",
        LogoutView.as_view(
            next_page="dashboard:login"
        ),
        name="logout",
    ),

    # =====================================
    # TREKKINGS
    # =====================================

    path(
        "trekkings/",
        views.trekkings,
        name="trekkings",
    ),

    path(
        "trekkings/<int:pk>/",
        views.trekking_detail,
        name="trekking_detail",
    ),

    # =====================================
    # CENTRO DE MONITOREO
    # =====================================

    path(
        "monitoreo/",
        views.monitoreo,
        name="monitoreo",
    ),

    # =====================================
    # INCIDENTES
    # =====================================

    # Listado con filtros por parque y estado.
    path(
        "incidentes/",
        incident_listing.incidents,
        name="incidents",
    ),

    # Detalle y seguimiento del incidente.
    path(
        "incidentes/<int:pk>/",
        incident_management.incident_detail,
        name="incident_detail",
    ),

    # Fotografía protegida mediante la vista.
    path(
        "incidentes/<int:pk>/fotografia/",
        incident_management.incident_photo,
        name="incident_photo",
    ),

    # =====================================
    # RESCATES
    # =====================================

    path(
        "rescates/",
        views.rescues,
        name="rescues",
    ),

    path(
        "rescates/<int:pk>/",
        rescue_management.rescue_detail,
        name="rescue_detail",
    ),
]
