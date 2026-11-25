
from datetime import timedelta

from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)
from django.db import IntegrityError, transaction

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.parks.models import Checkpoint

from apps.shared.responses import (
    success_response,
    error_response,
)

from apps.trekkings.models import (
    Trekking,
    TrekkingStatus,
    OfflineCheckpointEvent,
)


# ---------------------------------------------------------
# HITO — SINCRONIZACIÓN QR OFFLINE-FIRST
#
# Circuito:
# 1. Check-In en portería.
# 2. Checkpoints de ida, en orden.
# 3. Llegada a la cima.
# 4. Segundo escaneo para iniciar descenso.
# 5. Checkpoints de regreso, en orden inverso.
# 6. Check-Out en la portería original.
#
# REST funciona como NORMAL.
# VIEWPOINT final puede representar la cima.
#
# Se conserva:
# - Autenticación y propiedad del trekking.
# - UUID e idempotencia.
# - Validación cronológica.
# - Validación de QR y sendero.
# - Transacciones atómicas.
# - Estado del trekking.
# ---------------------------------------------------------


class IncomingQrEventSerializer(serializers.Serializer):
    local_id = serializers.UUIDField()

    checkpoint_id = serializers.IntegerField(
        min_value=1,
    )

    qr_identifier = serializers.CharField(
        max_length=255,
        allow_blank=False,
    )

    event_type = serializers.ChoiceField(
        choices=OfflineCheckpointEvent.EventType.choices,
    )

    occurred_at = serializers.DateTimeField()


class CheckpointBatchSerializer(serializers.Serializer):
    trekking_local_id = serializers.UUIDField()

    events = IncomingQrEventSerializer(
        many=True,
        allow_empty=False,
    )

    def validate_events(self, value):
        if len(value) > 100:
            raise serializers.ValidationError(
                "Envía como máximo 100 eventos por lote."
            )

        ids = [
            str(item["local_id"])
            for item in value
        ]

        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                "El lote contiene UUID duplicados."
            )

        return value


class QrBatchError(Exception):
    """
    Error de validación que provoca rollback
    de toda la transacción antes de responder.
    """

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class OfflineCheckpointBatchAPIView(APIView):
    """
    Recibe eventos QR generados por React Native.

    Los eventos permanecen en SQLite hasta que
    Django confirma sus UUID.

    La secuencia se valida también en el servidor.
    """

    permission_classes = [IsAuthenticated]

    # -----------------------------------------------------
    # NORMALIZAR TIPO DE CHECKPOINT
    # -----------------------------------------------------

    @staticmethod
    def checkpoint_kind(checkpoint):
        kind = getattr(
            checkpoint,
            "checkpoint_type",
            None,
        )

        if kind is None:
            kind = getattr(
                checkpoint,
                "type",
                None,
            )

        if kind is None:
            return ""

        kind = str(kind).upper()

        if kind == "INTERMEDIATE":
            return "NORMAL"

        return kind

    # -----------------------------------------------------
    # VERIFICAR UUID EXISTENTE
    # -----------------------------------------------------

    @staticmethod
    def event_matches(existing, incoming, trekking):
        return (
            existing.trekking_id == trekking.id
            and existing.checkpoint_id
            == incoming["checkpoint_id"]
            and existing.qr_identifier
            == incoming["qr_identifier"]
            and existing.event_type
            == incoming["event_type"]
            and existing.occurred_at
            == incoming["occurred_at"]
        )

    # -----------------------------------------------------
    # CONSTRUIR CIRCUITO QR
    # -----------------------------------------------------

    @classmethod
    def build_circuit(cls, checkpoints):
        """
        Construye la secuencia obligatoria
        utilizando el catálogo de Django.

        Mantiene la misma regla de la app:
        todos los letreros del circuito se
        escanean dos veces, con excepción
        de la función especial del Check-In
        y Check-Out en portería.
        """

        ordered = sorted(
            checkpoints.values(),
            key=lambda cp: (
                cp.sequence,
                cp.id,
            ),
        )

        entries = [
            cp
            for cp in ordered
            if cls.checkpoint_kind(cp) == "ENTRY"
        ]

        if len(entries) != 1:
            raise QrBatchError(
                "El sendero debe tener exactamente "
                "una portería de entrada configurada."
            )

        entry = entries[0]

        route = [
            cp
            for cp in ordered
            if cls.checkpoint_kind(cp)
            in (
                "NORMAL",
                "REST",
                "VIEWPOINT",
                "SUMMIT",
            )
        ]

        if not route:
            raise QrBatchError(
                "El sendero no tiene checkpoints "
                "para construir el circuito."
            )

        if any(
            cp.sequence <= entry.sequence
            for cp in route
        ):
            raise QrBatchError(
                "La secuencia de los checkpoints "
                "debe comenzar después de la entrada."
            )

        # Prioridad 1: SUMMIT explícito.

        explicit_summits = [
            cp
            for cp in route
            if cls.checkpoint_kind(cp) == "SUMMIT"
        ]

        if len(explicit_summits) > 1:
            raise QrBatchError(
                "El circuito tiene más de una "
                "cima configurada."
            )

        if len(explicit_summits) == 1:
            summit = explicit_summits[0]

        else:
            # Prioridad 2: último VIEWPOINT,
            # cuando es el único mirador y
            # además el último punto de ruta.

            viewpoints = [
                cp
                for cp in route
                if cls.checkpoint_kind(cp)
                == "VIEWPOINT"
            ]

            if (
                len(viewpoints) != 1
                or route[-1].id
                != viewpoints[0].id
            ):
                raise QrBatchError(
                    "No se puede identificar una "
                    "cima única. Configura un SUMMIT "
                    "o un VIEWPOINT final."
                )

            summit = viewpoints[0]

        # La cima debe cerrar la ida.

        if route[-1].id != summit.id:
            raise QrBatchError(
                "La cima debe ser el último "
                "checkpoint del recorrido de ida."
            )

        intermediates = [
            cp
            for cp in route
            if cp.id != summit.id
        ]

        # Cada paso se expresa como:
        # (checkpoint_id, tipo_evento)

        steps = [
            (entry.id, "CHECK_IN"),
        ]

        for cp in intermediates:
            steps.append(
                (
                    cp.id,
                    "CHECKPOINT_OUTBOUND",
                )
            )

        steps.append(
            (
                summit.id,
                "SUMMIT_ARRIVAL",
            )
        )

        steps.append(
            (
                summit.id,
                "SUMMIT_DESCENT",
            )
        )

        for cp in reversed(intermediates):
            steps.append(
                (
                    cp.id,
                    "CHECKPOINT_RETURN",
                )
            )

        steps.append(
            (
                entry.id,
                "CHECK_OUT",
            )
        )

        return steps

    # -----------------------------------------------------
    # VALIDAR HISTORIAL YA SINCRONIZADO
    # -----------------------------------------------------

    @staticmethod
    def validate_existing_history(
        existing_events,
        steps,
        checkpoints,
    ):
        """
        El historial del servidor debe ser
        un prefijo válido del circuito.

        Nunca se borra ni reordena el
        historial existente.
        """

        if len(existing_events) > len(steps):
            raise QrBatchError(
                "El historial QR del trekking "
                "contiene más eventos de los "
                "permitidos por el circuito.",
                status.HTTP_409_CONFLICT,
            )

        previous_time = None

        for index, event in enumerate(existing_events):
            expected_id, expected_type = steps[index]

            if (
                event.checkpoint_id != expected_id
                or event.event_type != expected_type
            ):
                raise QrBatchError(
                    "El historial QR sincronizado "
                    "no coincide con la secuencia "
                    "del circuito.",
                    status.HTTP_409_CONFLICT,
                )

            checkpoint = checkpoints.get(
                event.checkpoint_id
            )

            if (
                checkpoint is None
                or checkpoint.qr_identifier
                != event.qr_identifier
            ):
                raise QrBatchError(
                    "El historial contiene un QR "
                    "que no coincide con el "
                    "catálogo actual.",
                    status.HTTP_409_CONFLICT,
                )

            if (
                previous_time is not None
                and event.occurred_at < previous_time
            ):
                raise QrBatchError(
                    "El historial QR no está "
                    "ordenado cronológicamente.",
                    status.HTTP_409_CONFLICT,
                )

            previous_time = event.occurred_at

    # -----------------------------------------------------
    # SINCRONIZACIÓN POR LOTES
    # -----------------------------------------------------

    def post(self, request):
        serializer = CheckpointBatchSerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            return error_response(
                message="Lote QR inválido.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        incoming = sorted(
            data["events"],
            key=lambda item: (
                item["occurred_at"],
                str(item["local_id"]),
            ),
        )

        try:
            # Una sola transacción.
            #
            # Cualquier QrBatchError provoca
            # rollback de todos los INSERT
            # y UPDATE de este lote.

            with transaction.atomic():
                trekking = (
                    Trekking.objects
                    .select_for_update()
                    .filter(
                        local_id=data["trekking_local_id"],
                        user=request.user,
                    )
                    .first()
                )

                if trekking is None:
                    raise QrBatchError(
                        "La excursión no está "
                        "sincronizada o no "
                        "pertenece a tu cuenta.",
                        status.HTTP_404_NOT_FOUND,
                    )

                checkpoints = {
                    cp.id: cp
                    for cp in Checkpoint.objects.filter(
                        trail_id=trekking.trail_id,
                    )
                }

                steps = self.build_circuit(
                    checkpoints
                )

                existing_events = list(
                    OfflineCheckpointEvent.objects
                    .filter(trekking=trekking)
                    .order_by(
                        "occurred_at",
                        "id",
                    )
                )

                self.validate_existing_history(
                    existing_events,
                    steps,
                    checkpoints,
                )

                # Eventos nuevos registrados
                # dentro de esta transacción.

                history = list(existing_events)

                latest_time = (
                    history[-1].occurred_at
                    if history
                    else None
                )

                acknowledged = []
                created_count = 0

                for item in incoming:
                    event_id = item["local_id"]

                    # -------------------------------------
                    # IDEMPOTENCIA GLOBAL
                    # -------------------------------------

                    existing = (
                        OfflineCheckpointEvent.objects
                        .filter(local_id=event_id)
                        .first()
                    )

                    if existing is not None:
                        if not self.event_matches(
                            existing,
                            item,
                            trekking,
                        ):
                            raise QrBatchError(
                                "Un UUID QR ya corresponde "
                                "a otro evento.",
                                status.HTTP_409_CONFLICT,
                            )

                        acknowledged.append(
                            str(event_id)
                        )

                        continue

                    # -------------------------------------
                    # ESTADO DEL TREKKING
                    # -------------------------------------

                    if (
                        trekking.status
                        != TrekkingStatus.IN_PROGRESS
                    ):
                        raise QrBatchError(
                            "El trekking ya no admite "
                            "eventos QR nuevos.",
                            status.HTTP_409_CONFLICT,
                        )

                    # -------------------------------------
                    # IDENTIFICAR CHECKPOINT
                    # -------------------------------------

                    checkpoint = checkpoints.get(
                        item["checkpoint_id"]
                    )

                    if checkpoint is None:
                        raise QrBatchError(
                            "Un checkpoint no pertenece "
                            "al sendero del trekking."
                        )

                    if (
                        checkpoint.qr_identifier
                        != item["qr_identifier"]
                    ):
                        raise QrBatchError(
                            "El identificador QR no "
                            "coincide con Django."
                        )

                    event_type = item["event_type"]
                    occurred_at = item["occurred_at"]

                    # -------------------------------------
                    # FECHA Y HORA
                    # -------------------------------------

                    minimum_time = (
                        trekking.started_at
                        - timedelta(minutes=2)
                        if event_type == "CHECK_IN"
                        else trekking.started_at
                    )

                    if occurred_at < minimum_time:
                        raise QrBatchError(
                            "Un evento QR es anterior "
                            "al inicio del trekking."
                        )

                    if (
                        latest_time is not None
                        and occurred_at < latest_time
                    ):
                        raise QrBatchError(
                            "Los eventos QR nuevos "
                            "deben seguir el orden "
                            "cronológico de los ya "
                            "sincronizados.",
                            status.HTTP_409_CONFLICT,
                        )

                    # -------------------------------------
                    # VALIDAR SIGUIENTE PASO EXACTO
                    # -------------------------------------

                    position = len(history)

                    if position >= len(steps):
                        raise QrBatchError(
                            "El circuito QR ya está "
                            "completo.",
                            status.HTTP_409_CONFLICT,
                        )

                    expected_id, expected_type = (
                        steps[position]
                    )

                    if (
                        checkpoint.id != expected_id
                        or event_type != expected_type
                    ):
                        expected_checkpoint = (
                            checkpoints[expected_id]
                        )

                        raise QrBatchError(
                            "El evento QR no corresponde "
                            "al siguiente paso del circuito. "
                            f'Se espera "{expected_checkpoint.name}" '
                            f"({expected_type})."
                        )

                    # -------------------------------------
                    # GUARDAR EVENTO CON SU UUID ORIGINAL
                    # -------------------------------------

                    created = (
                        OfflineCheckpointEvent.objects.create(
                            local_id=event_id,
                            trekking=trekking,
                            checkpoint=checkpoint,
                            qr_identifier=(
                                item["qr_identifier"]
                            ),
                            event_type=event_type,
                            occurred_at=occurred_at,
                        )
                    )

                    history.append(created)

                    latest_time = occurred_at

                    acknowledged.append(
                        str(event_id)
                    )

                    created_count += 1

                    # -------------------------------------
                    # CHECK-OUT
                    # -------------------------------------

                    if event_type == "CHECK_OUT":
                        trekking.status = (
                            TrekkingStatus.COMPLETED
                        )

                        trekking.finished_at = (
                            occurred_at
                        )

                        trekking.save(
                            update_fields=[
                                "status",
                                "finished_at",
                            ]
                        )

                # El lote completo fue validado
                # y guardado correctamente.

                response_data = {
                    "trekking_id": trekking.id,
                    "acknowledged_event_ids": (
                        acknowledged
                    ),
                    "created": created_count,
                    "status": trekking.status,
                }

            # Fuera de la transacción:
            # este punto solo se alcanza
            # cuando el commit fue exitoso.

            return success_response(
                data=response_data,
                message=(
                    "Eventos QR sincronizados "
                    "correctamente."
                ),
                status_code=status.HTTP_200_OK,
            )

        except QrBatchError as error:
            return error_response(
                message=error.message,
                status_code=error.status_code,
            )

        except (
            IntegrityError,
            DjangoValidationError,
        ):
            return error_response(
                message=(
                    "No fue posible guardar el lote QR. "
                    "Los eventos deben reintentarse "
                    "sin cambiar sus UUID."
                ),
                status_code=status.HTTP_409_CONFLICT,
            )
