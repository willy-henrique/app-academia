import { createUserWithEmailAndPassword } from "firebase/auth";
import { z } from "zod";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";
import { authCopy } from "./auth-copy";
import {
  isLocalDevelopmentAuthEnabled,
  startLocalDevelopmentSession,
} from "./local-development-auth";

// Firebase Authentication requires at least six characters for email/password accounts.
const passwordMinimumLength = 6;

export const signUpSchema = z
  .object({
    confirmPassword: z.string(),
    email: z.string().trim().email("Informe um email válido."),
    password: z
      .string()
      .min(
        passwordMinimumLength,
        `A senha precisa ter ao menos ${passwordMinimumLength} caracteres.`,
      ),
  })
  .superRefine(({ confirmPassword, password }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "As senhas precisam ser iguais.",
        path: ["confirmPassword"],
      });
    }
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export class SignUpError extends Error {
  constructor(message: string = authCopy.genericSignupFailure) {
    super(message);
    this.name = "SignUpError";
  }
}

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

function getSignUpErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);

  if (code === "auth/email-already-in-use") {
    return authCopy.signupEmailAlreadyInUse;
  }

  if (code === "auth/operation-not-allowed") {
    return authCopy.signupProviderDisabled;
  }

  return authCopy.genericSignupFailure;
}

/**
 * Cria uma conta no Firebase Auth sem expor detalhes internos de falha na UI.
 * A criação dos perfis WillTreino ocorrerá no fluxo servidor da fase de identidade.
 */
export async function signUpWithEmail(input: SignUpInput): Promise<void> {
  const { email, password } = signUpSchema.parse(input);

  if (isLocalDevelopmentAuthEnabled()) {
    startLocalDevelopmentSession(email);
    return;
  }

  try {
    const { auth } = getFirebaseClientServices();
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new SignUpError(getSignUpErrorMessage(error));
  }
}
