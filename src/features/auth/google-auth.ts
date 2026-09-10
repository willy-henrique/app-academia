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

export class GoogleAuthError extends Error {
  constructor() {
    super(authCopy.genericGoogleFailure);
    this.name = "GoogleAuthError";
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

    throw new GoogleAuthError();
  }
}
