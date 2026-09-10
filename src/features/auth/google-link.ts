import { linkWithPopup, linkWithRedirect } from "firebase/auth";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

import { authCopy } from "./auth-copy";
import { createGoogleAuthProvider } from "./google-auth";

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

export type GoogleLinkResult = "POPUP_COMPLETED" | "REDIRECT_STARTED";

export class GoogleLinkError extends Error {
  constructor() {
    super(authCopy.genericLinkFailure);
    this.name = "GoogleLinkError";
  }
}

export class GoogleLinkRequiresRecentLoginError extends Error {
  constructor() {
    super(authCopy.googleLinkRequiresRecentLogin);
    this.name = "GoogleLinkRequiresRecentLoginError";
  }
}

export class GoogleLinkConflictError extends Error {
  constructor() {
    super(authCopy.googleLinkConflict);
    this.name = "GoogleLinkConflictError";
  }
}

export class GoogleLinkRequiresSignedInUserError extends Error {
  constructor() {
    super(authCopy.googleLinkRequiresSignedInUser);
    this.name = "GoogleLinkRequiresSignedInUserError";
  }
}

export async function linkGoogleAccount(): Promise<GoogleLinkResult> {
  const { auth } = getFirebaseClientServices();
  const user = auth.currentUser;

  if (!user) {
    throw new GoogleLinkRequiresSignedInUserError();
  }

  const provider = createGoogleAuthProvider();

  try {
    await linkWithPopup(user, provider);
    return "POPUP_COMPLETED";
  } catch (error) {
    const code = getFirebaseErrorCode(error);

    if (code && redirectFallbackCodes.has(code)) {
      await linkWithRedirect(user, provider);
      return "REDIRECT_STARTED";
    }

    if (code === "auth/requires-recent-login") {
      throw new GoogleLinkRequiresRecentLoginError();
    }

    if (
      code === "auth/credential-already-in-use" ||
      code === "auth/provider-already-linked" ||
      code === "auth/email-already-in-use"
    ) {
      throw new GoogleLinkConflictError();
    }

    throw new GoogleLinkError();
  }
}
