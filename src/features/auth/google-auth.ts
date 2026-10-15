import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";
import { authCopy } from "./auth-copy";

const redirectFallbackCodes = new Set([
  "auth/operation-not-supported-in-this-environment",
  "auth/popup-blocked",
]);

function getFirebaseErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export class GoogleAccountConflictError extends Error {
  constructor() {
    super(authCopy.googleConflictGuidance);
    this.name = "GoogleAccountConflictError";
  }
}

const googleFailureCopy: Record<string, string> = {
  "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir. Tente de novo.",
  "auth/cancelled-popup-request":
    "Já existe uma janela do Google aberta. Conclua nela ou tente de novo.",
  "auth/network-request-failed": "Sem conexão com o Google. Verifique a internet e tente de novo.",
  "auth/unauthorized-domain":
    "Este endereço ainda não está autorizado para entrar com Google. Fale com o suporte.",
  "auth/operation-not-allowed":
    "O login com Google não está ativado neste app. Fale com o suporte.",
};

export class GoogleAuthError extends Error {
  readonly code: string | undefined;

  constructor(code?: string) {
    const known = code ? googleFailureCopy[code] : undefined;
    super(
      known ??
        (code
          ? `${authCopy.genericGoogleFailure} (código: ${code})`
          : authCopy.genericGoogleFailure),
    );
    this.name = "GoogleAuthError";
    this.code = code;
  }
}

export type GoogleSignInResult = "POPUP_COMPLETED" | "REDIRECT_STARTED";

export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Inicia OAuth no Firebase Auth. Popup é a primeira opção; redirect é usado
 * apenas quando o navegador bloqueia popups ou não suporta esse fluxo.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const { auth } = getFirebaseClientServices();
  const provider = createGoogleAuthProvider();

  try {
    await signInWithPopup(auth, provider);
    return "POPUP_COMPLETED";
  } catch (error) {
    const code = getFirebaseErrorCode(error);

    if (code === "auth/account-exists-with-different-credential") {
      throw new GoogleAccountConflictError();
    }

    if (code && redirectFallbackCodes.has(code)) {
      await signInWithRedirect(auth, provider);
      return "REDIRECT_STARTED";
    }

    console.error("[google-auth] falha no login com Google:", code ?? error);
    throw new GoogleAuthError(code);
  }
}
