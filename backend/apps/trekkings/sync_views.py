
from datetime import datetime, timedelta

from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.shared.responses import (
    success_response,
    error_response,
)

from apps.trekkings.models import (
    Trekking,
    TrekkingStatus,
    TrekkingCompanion,
)

from apps.trekkings.serializers import TrekkingSerializer

from apps.trekkings.sync_serializers import (
    OfflineTrekkingBootstrapSerializer,
)


# ---------------------------------------------------------
# HITO — SINCRONIZACIÓN OFFLINE-FIRST
#
# Bootstrap de excursiones iniciadas mediante QR.
#
# SQLite -> Django REST Framework -> MySQL
#
# Permite:
# - Conservar UUID local.
# - Conservar fecha real del Check-In.
# - Registrar sendero y acompañantes.
# - Evitar duplicados durante reintentos.
# - Validar propietario mediante JWT.
# - Calcular hora estimada según el TimeField del parque.
#
# No sincroniza todavía:
# - Eventos QR.
# - Check-Out.
# - Tracking GPS.
# - Incidentes.
# - Solicitudes de rescate.
# ---------------------------------------------------------


class OfflineTrekkingBootstrapAPIView(APIView):
    """
    Registra en Django un trekking iniciado offline.

    Un trekking puede haber comenzado horas o días
    antes de recuperar la conexión.

    La sincronización conserva la fecha real
    del Check-In y nunca finaliza automáticamente
    la excursión.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=OfflineTrekkingBootstrapSerializer,
        responses={
            200: TrekkingSerializer,
            201: TrekkingSerializer,
        },
        summary="Sincronizar inicio de trekking offline",
        description=(
            "Registra de forma idempotente una excursión "
            "iniciada mediante Check-In QR en SQLite."
        ),
    )
    def post(self, request):
        # -------------------------------------------------
        # 1. VALIDAR SOLICITUD
        # -------------------------------------------------

        serializer = OfflineTrekkingBootstrapSerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            return error_response(
                message="Datos de sincronización inválidos.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        local_id = data["local_id"]
        trail = data["trail"]
        started_at = data["started_at"]

        companions_data = data.get(
            "companions",
            [],
        )

        # -------------------------------------------------
        # 2. COMPROBAR SI YA EXISTE EL TREKKING
        # -------------------------------------------------

        existing = (
            Trekking.objects
            .prefetch_related("companions")
            .filter(local_id=local_id)
            .first()
        )

        if existing is not None:
            return self._existing_response(
                existing=existing,
                user=request.user,
                trail=trail,
                started_at=started_at,
                companions_data=companions_data,
            )

        # -------------------------------------------------
        # 3. CALCULAR RETORNO ESTIMADO
        # -------------------------------------------------

        # El campo default_return_time de Park
        # es un TimeField.
        #
        # Ejemplos de la base de datos Hito:
        #
        # Torres del Paine: 18:00
        # Altos de Lircay: 17:00
        #
        # NO representa una duración en minutos.
        #
        # La fecha base será siempre la fecha real
        # del Check-In registrada por la aplicación.

        return_time = trail.park.default_return_time

        if return_time is None:
            return error_response(
                message=(
                    "El parque no tiene configurada "
                    "una hora estimada de regreso."
                ),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Django utiliza fechas con zona horaria.
        # Convertimos el inicio a la zona local
        # configurada para el proyecto.

        if timezone.is_aware(started_at):
            local_started_at = timezone.localtime(
                started_at,
            )
        else:
            local_started_at = timezone.make_aware(
                started_at,
                timezone.get_current_timezone(),
            )

        current_timezone = timezone.get_current_timezone()

        # Combinar la fecha del Check-In con
        # el horario de retorno del parque.

        estimated_local = datetime.combine(
            local_started_at.date(),
            return_time,
        )

        if timezone.is_aware(estimated_local):
            estimated_return_time = estimated_local
        else:
            estimated_return_time = timezone.make_aware(
                estimated_local,
                current_timezone,
            )

        # El modelo Trekking exige que el retorno
        # estimado no sea anterior a started_at.
        #
        # Si el Check-In ocurrió después de la hora
        # configurada, usamos la siguiente ocurrencia
        # de esa hora para mantener la consistencia
        # del modelo.
        #
        # Esta es una regla técnica provisional:
        # NO autoriza permanencia nocturna.
        #
        # Tampoco termina el trekking de manera
        # automática.

        if estimated_return_time < local_started_at:
            next_date = (
                local_started_at.date() +
                timedelta(days=1)
            )

            estimated_local = datetime.combine(
                next_date,
                return_time,
            )

            if timezone.is_aware(estimated_local):
                estimated_return_time = estimated_local
            else:
                estimated_return_time = timezone.make_aware(
                    estimated_local,
                    current_timezone,
                )

        # -------------------------------------------------
        # 4. CREACIÓN ATÓMICA DEL TREKKING
        # -------------------------------------------------

        try:
            with transaction.atomic():

                # Verificar que los UUID de acompañantes
                # no estén vinculados a otro trekking.

                companion_ids = [
                    item["local_id"]
                    for item in companions_data
                ]

                if companion_ids:
                    already_used = (
                        TrekkingCompanion.objects
                        .filter(
                            local_id__in=companion_ids
                        )
                        .exists()
                    )

                    if already_used:
                        return error_response(
                            message=(
                                "Uno o más identificadores "
                                "de acompañantes ya están "
                                "registrados."
                            ),
                            status_code=(
                                status.HTTP_409_CONFLICT
                            ),
                        )

                # Crear el trekking con el UUID y
                # la fecha originales de SQLite.
                #
                # La identidad del propietario
                # proviene del JWT, no del payload.

                trekking = Trekking.objects.create(
                    local_id=local_id,
                    user=request.user,
                    trail=trail,
                    status=TrekkingStatus.IN_PROGRESS,
                    started_at=started_at,
                    estimated_return_time=(
                        estimated_return_time
                    ),
                )

                # Registrar los acompañantes
                # asociados a esta excursión.

                for companion_data in companions_data:
                    TrekkingCompanion.objects.create(
                        trekking=trekking,
                        local_id=companion_data["local_id"],
                        first_name=companion_data[
                            "first_name"
                        ],
                        last_name=companion_data[
                            "last_name"
                        ],
                        sex=companion_data.get(
                            "sex",
                            "",
                        ),
                        emergency_contact_name=(
                            companion_data[
                                "emergency_contact_name"
                            ]
                        ),
                        emergency_contact_phone=(
                            companion_data[
                                "emergency_contact_phone"
                            ]
                        ),
                    )

        # -------------------------------------------------
        # 5. CONTROLAR ERRORES DE BASE DE DATOS
        # -------------------------------------------------

        except IntegrityError:
            # Una petición concurrente podría
            # haber creado el mismo UUID.
            #
            # Recuperamos ese registro y validamos
            # que corresponda exactamente a la
            # solicitud que estamos procesando.

            existing = (
                Trekking.objects
                .prefetch_related("companions")
                .filter(local_id=local_id)
                .first()
            )

            if existing is not None:
                return self._existing_response(
                    existing=existing,
                    user=request.user,
                    trail=trail,
                    started_at=started_at,
                    companions_data=companions_data,
                )

            return error_response(
                message=(
                    "Conflicto de identificadores "
                    "durante la sincronización."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        except DjangoValidationError as exc:
            return error_response(
                message=(
                    "No fue posible validar el trekking "
                    "o sus acompañantes."
                ),
                errors={
                    "validation": exc.messages,
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # 6. DEVOLVER REGISTRO CONFIRMADO
        # -------------------------------------------------

        # Recuperamos los acompañantes para incluirlos
        # en la respuesta que recibirá el móvil.

        trekking = (
            Trekking.objects
            .prefetch_related("companions")
            .get(pk=trekking.pk)
        )

        return success_response(
            data=TrekkingSerializer(trekking).data,
            message=(
                "Trekking offline registrado "
                "correctamente."
            ),
            status_code=status.HTTP_201_CREATED,
        )

    # -----------------------------------------------------
    # VERIFICAR ACOMPAÑANTES EN REINTENTOS
    # -----------------------------------------------------

    @staticmethod
    def _same_companions(
        existing,
        companions_data,
    ):
        stored_companions = list(
            existing.companions.all()
        )

        if len(stored_companions) != len(
            companions_data
        ):
            return False

        # Comparamos por UUID y no por posición,
        # ya que el orden puede ser diferente.

        stored_by_uuid = {
            str(companion.local_id): companion
            for companion in stored_companions
        }

        fields = (
            "first_name",
            "last_name",
            "sex",
            "emergency_contact_name",
            "emergency_contact_phone",
        )

        for incoming in companions_data:
            companion_local_id = str(
                incoming["local_id"]
            )

            stored = stored_by_uuid.get(
                companion_local_id
            )

            if stored is None:
                return False

            for field in fields:
                stored_value = getattr(
                    stored,
                    field,
                )

                incoming_value = incoming.get(
                    field,
                    "",
                )

                if stored_value != incoming_value:
                    return False

        return True

    # -----------------------------------------------------
    # RESPUESTA IDEMPOTENTE
    # -----------------------------------------------------

    def _existing_response(
        self,
        existing,
        user,
        trail,
        started_at,
        companions_data,
    ):
        # Nunca devolver datos de un trekking
        # perteneciente a otra cuenta.

        if existing.user_id != user.pk:
            return error_response(
                message=(
                    "El identificador local "
                    "ya está en uso."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        # Comprobar el sendero original.

        if existing.trail_id != trail.pk:
            return error_response(
                message=(
                    "El UUID corresponde a "
                    "otro sendero."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        # Comprobar la fecha real del Check-In.

        if existing.started_at != started_at:
            return error_response(
                message=(
                    "El UUID corresponde a una "
                    "fecha de inicio diferente."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        # Comprobar que los acompañantes
        # coincidan con el registro original.

        if not self._same_companions(
            existing,
            companions_data,
        ):
            return error_response(
                message=(
                    "Los acompañantes no coinciden "
                    "con el registro original."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )

        # El trekking ya existe y corresponde
        # a los mismos datos.
        #
        # Devolvemos su ID sin crear otro.

        return success_response(
            data=TrekkingSerializer(existing).data,
            message=(
                "Trekking previamente sincronizado. "
                "Se recuperó el registro existente."
            ),
            status_code=status.HTTP_200_OK,
        )
