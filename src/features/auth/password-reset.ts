import { sendPasswordResetEmail } from "firebase/auth";
import { z } from "zod";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

export const passwordResetSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

/**
 * Solicita o email de redefinição sem revelar se a conta existe. O Firebase
 * mantém suas próprias proteções de abuso e os erros internos não chegam à UI.
 */
export async function requestPasswordReset(input: PasswordResetInput): Promise<void> {
  const { email } = passwordResetSchema.parse(input);

  try {
    const { auth } = getFirebaseClientServices();
    await sendPasswordResetEmail(auth, email);
  } catch {
    // A resposta externa permanece neutra para não permitir enumeração de contas.
  }
}
