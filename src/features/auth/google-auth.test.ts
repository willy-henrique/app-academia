import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, setCustomParameters, signInWithPopup, signInWithRedirect } =
  vi.hoisted(() => ({
    getFirebaseClientServices: vi.fn(),
    setCustomParameters: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
  }));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {
    setCustomParameters = setCustomParameters;
  },
  signInWithPopup,
  signInWithRedirect,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import { GoogleAccountConflictError, GoogleAuthError, signInWithGoogle } from "./google-auth";

describe("signInWithGoogle", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    setCustomParameters.mockReset();
    signInWithPopup.mockReset();
    signInWithRedirect.mockReset();
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
  });

  it("uses a Google popup with account selection", async () => {
    signInWithPopup.mockResolvedValue({});

    await expect(signInWithGoogle()).resolves.toBe("POPUP_COMPLETED");
    expect(setCustomParameters).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(signInWithPopup).toHaveBeenCalledWith("firebase-auth", expect.anything());
  });

  it("uses redirect only when the browser cannot open the popup", async () => {
    signInWithPopup.mockRejectedValue({ code: "auth/popup-blocked" });
    signInWithRedirect.mockResolvedValue(undefined);

    await expect(signInWithGoogle()).resolves.toBe("REDIRECT_STARTED");
    expect(signInWithRedirect).toHaveBeenCalledWith("firebase-auth", expect.anything());
  });

  it("preserves an account-linking conflict for the dedicated flow", async () => {
    signInWithPopup.mockRejectedValue({ code: "auth/account-exists-with-different-credential" });

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleAccountConflictError);
  });

  it("does not expose other Firebase failures", async () => {
    signInWithPopup.mockRejectedValue({ code: "auth/internal-error" });

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleAuthError);
  });
});
