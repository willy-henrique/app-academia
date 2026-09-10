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
  constructor() {
    super(authCopy.genericLoginFailure);
    this.name = "LoginError";
  }
}

/** Autentica sem revelar se um endereço de email possui ou não uma conta. */
export async function loginWithEmail(input: LoginInput): Promise<void> {
  const { email, password } = loginSchema.parse(input);

  if (isLocalDevelopmentAuthEnabled()) {
    if (password.length < 6) {
      throw new LoginError();
    }

    startLocalDevelopmentSession(email);
    return;
  }

  try {
    const { auth } = getFirebaseClientServices();
    await signInWithEmailAndPassword(auth, email, password);
  } catch {
    throw new LoginError();
  }
}
