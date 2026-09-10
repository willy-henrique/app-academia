import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminServices } from "@/infrastructure/firebase/admin";

export class MissingFirebaseAuthTokenError extends Error {
  constructor() {
    super("Authorization bearer token não informado.");
    this.name = "MissingFirebaseAuthTokenError";
  }
}

export class InvalidFirebaseAuthTokenError extends Error {
  constructor() {
    super("Authorization bearer token inválido.");
    this.name = "InvalidFirebaseAuthTokenError";
  }
}

export function readFirebaseBearerToken(
  authorizationHeader: string | null | undefined,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }

  return token;
}

/**
 * O Firebase marca problemas do próprio token com um código `auth/*`. Qualquer
 * outra falha — credencial ausente, rede, projeto mal configurado — é do
 * servidor, e tratá-la como token inválido faz o usuário relogar sem fim.
 */
function isRejectedTokenError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  );
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  try {
    const { auth } = getFirebaseAdminServices();
    return await auth.verifyIdToken(idToken, true);
  } catch (error) {
    if (isRejectedTokenError(error)) {
      // Sem detalhes: a UI não deve aprender por que o token foi recusado.
      throw new InvalidFirebaseAuthTokenError();
    }

    throw error;
  }
}

export async function requireFirebaseAuth(
  headerSource: Pick<Headers, "get">,
): Promise<DecodedIdToken> {
  const bearerToken = readFirebaseBearerToken(headerSource.get("authorization"));

  if (!bearerToken) {
    throw new MissingFirebaseAuthTokenError();
  }

  return verifyFirebaseIdToken(bearerToken);
}
