import { signOut } from "firebase/auth";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";
import { authCopy } from "./auth-copy";
import {
  endLocalDevelopmentSession,
  isLocalDevelopmentAuthEnabled,
} from "./local-development-auth";

export class LogoutError extends Error {
  constructor() {
    super(authCopy.genericLogoutFailure);
    this.name = "LogoutError";
  }
}

/**
 * Encerra a sessão atual do Firebase Auth. A UI pode reagir ao estado
 * derivado do `AuthSessionProvider` sem manter tokens próprios.
 */
export async function logoutFromFirebase(): Promise<void> {
  if (isLocalDevelopmentAuthEnabled()) {
    endLocalDevelopmentSession();
    return;
  }

  try {
    const { auth } = getFirebaseClientServices();
    await signOut(auth);
  } catch {
    throw new LogoutError();
  }
}
