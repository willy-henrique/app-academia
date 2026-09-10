import { signInWithEmailAndPassword } from "firebase/auth";
import { z } from "zod";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";
import { authCopy } from "./auth-copy";
import {
  isLocalDevelopmentAuthEnabled,
  startLocalDevelopmentSession,
} from "./local-development-auth";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export class LoginError extends Error {
  constructor(message: string = authCopy.genericLoginFailure) {
    super(message);
    this.name = "LoginError";
  }
}

function getLoginErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: string }).code;
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-login-credentials"
    ) {
      return "E-mail ou senha incorretos. Verifique e tente novamente.";
    }
    if (code === "auth/too-many-requests") {
      return "Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.";
    }
    if (code === "auth/user-disabled") {
      return "Esta conta foi desativada temporariamente.";
    }
  }
  return authCopy.genericLoginFailure;
}

/** Autentica com mensagem amigável e clara em caso de credenciais inválidas. */
export async function loginWithEmail(input: LoginInput): Promise<void> {
  const { email, password } = loginSchema.parse(input);

  if (isLocalDevelopmentAuthEnabled()) {
    if (password.length < 6) {
      throw new LoginError("E-mail ou senha incorretos.");
    }

    startLocalDevelopmentSession(email);
    return;
  }

  try {
    const { auth } = getFirebaseClientServices();
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new LoginError(getLoginErrorMessage(error));
  }
}
