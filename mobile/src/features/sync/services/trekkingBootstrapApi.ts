
/**
 * HITO — Sincronización de inicio de trekking
 *
 * Envía a Django una excursión iniciada offline.
 *
 * IMPORTANTE:
 * - No crea ni modifica registros SQLite.
 * - No marca trekkings como sincronizados.
 * - No realiza reintentos automáticos.
 * - Conserva los UUID originales.
 * - Acepta respuestas HTTP 200 y 201.
 *
 * El bloqueo de concurrencia se administra
 * desde localTrekkingBootstrapSync.ts.
 */

export interface BootstrapCompanion {
  local_id: string;
  first_name: string;
  last_name: string;
  sex?: "M" | "F" | "O" | "N" | "";
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface BootstrapTrekkingPayload {
  local_id: string;
  trail: number;
  started_at: string;
  companions: BootstrapCompanion[];
}

export interface BootstrapTrekkingResponse {
  id: number;
  local_id: string;
  trail: number;
  status: string;
  started_at: string;
  estimated_return_time: string;
}

interface ApiEnvelope {
  success?: boolean;
  message?: string;
  data?: unknown;
  errors?: unknown;
}

export interface BootstrapRequestOptions {
  /**
   * URL base del API.
   *
   * Ejemplo:
   * http://192.168.1.10:8000/api/v1
   *
   * Debe provenir de la configuración
   * existente de Hito.
   */
  apiBaseUrl: string;

  /**
   * JWT de acceso del excursionista.
   */
  accessToken: string;

  /**
   * Tiempo máximo de espera en milisegundos.
   */
  timeoutMs?: number;
}

export interface BootstrapResult {
  trekking: BootstrapTrekkingResponse;

  /**
   * true cuando Django recuperó
   * un trekking previamente sincronizado.
   */
  alreadyExisted: boolean;
}

// ---------------------------------------------------------
// VALIDACIONES
// ---------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidUuid(value: string): boolean {
  return (
    typeof value === "string" &&
    UUID_REGEX.test(value)
  );
}

function validatePayload(
  payload: BootstrapTrekkingPayload,
): void {
  if (!isValidUuid(payload.local_id)) {
    throw new Error(
      "El trekking no tiene un UUID local válido.",
    );
  }

  if (
    !Number.isSafeInteger(payload.trail) ||
    payload.trail <= 0
  ) {
    throw new Error(
      "El identificador del sendero no es válido.",
    );
  }

  // Validar fecha ISO 8601 con zona horaria.
  // Acepta Z o un desplazamiento como -03:00.
  const ISO_WITH_TIMEZONE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;

  if (
    typeof payload.started_at !== "string" ||
    !ISO_WITH_TIMEZONE.test(payload.started_at) ||
    Number.isNaN(Date.parse(payload.started_at))
  ) {
    throw new Error(
      "La fecha del Check-In debe incluir una zona horaria válida.",
    );
  }

  if (!Array.isArray(payload.companions)) {
    throw new Error(
      "La lista de acompañantes no es válida.",
    );
  }

  const companionIds = new Set<string>();

  for (const companion of payload.companions) {
    if (!isValidUuid(companion.local_id)) {
      throw new Error(
        "Un acompañante no tiene un UUID válido.",
      );
    }

    const normalizedId =
      companion.local_id.toLowerCase();

    if (companionIds.has(normalizedId)) {
      throw new Error(
        "Existen acompañantes con UUID duplicados.",
      );
    }

    companionIds.add(normalizedId);

    if (
      !companion.first_name?.trim() ||
      !companion.last_name?.trim()
    ) {
      throw new Error(
        "Los acompañantes deben tener nombre y apellido.",
      );
    }

    if (
      !companion.emergency_contact_name?.trim() ||
      !companion.emergency_contact_phone?.trim()
    ) {
      throw new Error(
        "Faltan datos del contacto de emergencia de un acompañante.",
      );
    }

    if (
      companion.sex !== undefined &&
      !["", "M", "F", "O", "N"].includes(
        companion.sex,
      )
    ) {
      throw new Error(
        "Un acompañante tiene un valor de sexo inválido.",
      );
    }
  }
}

// ---------------------------------------------------------
// VALIDAR RESPUESTA DE DJANGO
// ---------------------------------------------------------

function parseTrekkingResponse(
  value: unknown,
  requestedLocalId: string,
): BootstrapTrekkingResponse {
  if (!isRecord(value)) {
    throw new Error(
      "Django devolvió una respuesta de trekking inválida.",
    );
  }

  const {
    id,
    local_id,
    trail,
    status,
    started_at,
    estimated_return_time,
  } = value;

  if (
    typeof id !== "number" ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof local_id !== "string" ||
    !isValidUuid(local_id) ||
    local_id.toLowerCase() !==
      requestedLocalId.toLowerCase() ||
    typeof trail !== "number" ||
    !Number.isSafeInteger(trail) ||
    trail <= 0 ||
    typeof status !== "string" ||
    typeof started_at !== "string" ||
    typeof estimated_return_time !== "string"
  ) {
    throw new Error(
      "No se pudo verificar la respuesta de Django. El registro local no debe marcarse como sincronizado.",
    );
  }

  if (
    Number.isNaN(Date.parse(started_at)) ||
    Number.isNaN(
      Date.parse(estimated_return_time),
    )
  ) {
    throw new Error(
      "Django devolvió fechas inválidas.",
    );
  }

  return {
    id,
    local_id,
    trail,
    status,
    started_at,
    estimated_return_time,
  };
}

// ---------------------------------------------------------
// MENSAJES DE ERROR
// ---------------------------------------------------------

function extractErrorMessage(
  body: unknown,
  httpStatus: number,
): string {
  if (isRecord(body)) {
    const message = body.message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  if (httpStatus === 401) {
    return (
      "Tu sesión expiró. Inicia sesión nuevamente."
    );
  }

  if (httpStatus === 403) {
    return (
      "No tienes autorización para sincronizar este trekking."
    );
  }

  if (httpStatus === 409) {
    return (
      "Existe un conflicto con los datos originales del trekking."
    );
  }

  return (
    `Django rechazó la sincronización ` +
    `(HTTP ${httpStatus}).`
  );
}

// ---------------------------------------------------------
// SINCRONIZAR TREKKING CON DJANGO
// ---------------------------------------------------------

/**
 * Sincroniza únicamente el registro inicial
 * de una excursión y sus acompañantes.
 *
 * El llamador debe guardar el server_id
 * en SQLite mediante una transacción segura.
 */
export async function bootstrapOfflineTrekking(
  payload: BootstrapTrekkingPayload,
  options: BootstrapRequestOptions,
): Promise<BootstrapResult> {
  // 1. Validar datos originales.
  validatePayload(payload);

  // 2. Validar configuración.
  const baseUrl = options.apiBaseUrl.trim();

  if (!baseUrl) {
    throw new Error(
      "No existe una URL configurada para Django.",
    );
  }

  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error(
      "La URL de Django debe comenzar con http:// o https://.",
    );
  }

  if (!options.accessToken?.trim()) {
    throw new Error(
      "No existe una sesión autenticada para sincronizar.",
    );
  }

  const timeoutMs = options.timeoutMs ?? 15000;

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      "El tiempo de espera configurado no es válido.",
    );
  }

  // 3. Construir endpoint sin duplicar barras.
  const endpoint =
    `${baseUrl.replace(/\/+$/, "")}` +
    "/trekkings/sync/bootstrap/";

  // 4. Configurar tiempo máximo de espera.
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // 5. Enviar petición autenticada.
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // 6. Leer respuesta.
    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      throw new Error(
        "Django devolvió una respuesta que no es JSON válido.",
      );
    }

    // 7. Verificar HTTP.
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(
          body,
          response.status,
        ),
      );
    }

    if (
      response.status !== 200 &&
      response.status !== 201
    ) {
      throw new Error(
        `Respuesta HTTP inesperada: ${response.status}.`,
      );
    }

    // 8. Verificar sobre JSON.
    if (!isRecord(body)) {
      throw new Error(
        "El formato de respuesta del servidor no es válido.",
      );
    }

    const envelope = body as ApiEnvelope;

    if (envelope.success !== true) {
      throw new Error(
        envelope.message ||
          "Django no confirmó la sincronización.",
      );
    }

    // 9. Validar trekking devuelto.
    const trekking = parseTrekkingResponse(
      envelope.data,
      payload.local_id,
    );

    // 10. Evitar confirmar datos incorrectos.
    if (trekking.trail !== payload.trail) {
      throw new Error(
        "Django devolvió un sendero diferente al solicitado.",
      );
    }

    const localStart = Date.parse(
      payload.started_at,
    );

    const serverStart = Date.parse(
      trekking.started_at,
    );

    if (localStart !== serverStart) {
      throw new Error(
        "La fecha original del Check-In no coincide con Django.",
      );
    }

    // 11. Devolver resultado.
    // Esta función NO escribe en SQLite.
    return {
      trekking,
      alreadyExisted: response.status === 200,
    };
  } catch (error) {
    // Un timeout no implica que Django
    // no haya recibido el registro.
    //
    // El reintento debe conservar el mismo UUID.
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Se agotó el tiempo de espera. El trekking podría haberse registrado en Django; debe reintentarse con el mismo UUID.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
