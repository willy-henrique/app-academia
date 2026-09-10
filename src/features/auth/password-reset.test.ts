import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, sendPasswordResetEmail } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("firebase/auth", () => ({ sendPasswordResetEmail }));
vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import { passwordResetSchema, requestPasswordReset } from "./password-reset";

describe("requestPasswordReset", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    sendPasswordResetEmail.mockReset();
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
  });

  it("validates the email before calling Firebase", async () => {
    expect(passwordResetSchema.safeParse({ email: "invalid" }).success).toBe(false);

    await expect(requestPasswordReset({ email: "invalid" })).rejects.toThrow(
      "Informe um email válido.",
    );
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("requests the Firebase reset email", async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);

    await requestPasswordReset({ email: "willy@example.com" });

    expect(sendPasswordResetEmail).toHaveBeenCalledWith("firebase-auth", "willy@example.com");
  });

  it("resolves even if Firebase rejects an unknown email", async () => {
    sendPasswordResetEmail.mockRejectedValue(new Error("auth/user-not-found"));

    await expect(requestPasswordReset({ email: "willy@example.com" })).resolves.toBeUndefined();
  });
});
