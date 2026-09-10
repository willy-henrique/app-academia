import { reload, sendEmailVerification } from "firebase/auth";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";
import { authCopy } from "./auth-copy";

export type EmailVerificationStatus = "AUTH_REQUIRED" | "UNVERIFIED" | "VERIFIED";
export type EmailVerificationRequestResult = "SENT" | "ALREADY_VERIFIED";

export class EmailVerificationError extends Error {
  constructor() {
    super(authCopy.emailVerificationFailure);
    this.name = "EmailVerificationError";
  }
}

export async function getEmailVerificationStatus(): Promise<EmailVerificationStatus> {
  const { auth } = getFirebaseClientServices();
  const user = auth.currentUser;

  if (!user) {
    return "AUTH_REQUIRED";
  }

  await reload(user);
  return user.emailVerified ? "VERIFIED" : "UNVERIFIED";
}

/** Solicita a mensagem oficial do Firebase para a conta autenticada atual. */
export async function requestEmailVerification(): Promise<EmailVerificationRequestResult> {
  const { auth } = getFirebaseClientServices();
  const user = auth.currentUser;

  if (!user) {
    throw new EmailVerificationError();
  }

  try {
    await reload(user);
    if (user.emailVerified) {
      return "ALREADY_VERIFIED";
    }

    await sendEmailVerification(user);
    return "SENT";
  } catch {
    throw new EmailVerificationError();
  }
}
