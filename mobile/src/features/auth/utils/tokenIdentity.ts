
import { jwtDecode } from "jwt-decode";

interface HitoJwtPayload {
  user_id?: number | string;
  token_type?: string;
  exp?: number;
}

/**
 * Obtiene la identidad declarada en el JWT
 * emitido por Django.
 *
 * No verifica la firma del token.
 * La autenticación y autorización corresponden
 * a Django y al flujo de sesión existente.
 */
export function getUserIdFromToken(
  accessToken: string,
): string {
  if (!accessToken.trim()) {
    throw new Error(
      "No existe un token de acceso disponible.",
    );
  }

  const payload = jwtDecode<HitoJwtPayload>(
    accessToken,
  );

  if (
    payload.token_type !== "access" ||
    payload.user_id === undefined ||
    payload.user_id === null
  ) {
    throw new Error(
      "El token no contiene una identidad de usuario válida.",
    );
  }

  const userId = String(payload.user_id);

  if (!/^[1-9]\d*$/.test(userId)) {
    throw new Error(
      "El identificador del usuario no es válido.",
    );
  }

  return userId;
}
