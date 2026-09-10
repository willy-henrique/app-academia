import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, signInWithEmailAndPassword } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import { LoginError, loginSchema, loginWithEmail } from "./login";

describe("loginWithEmail", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    signInWithEmailAndPassword.mockReset();
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
  });

  it("rejects malformed credentials before reaching Firebase", async () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "" });

    expect(result.success).toBe(false);
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("starts a Firebase Auth session with validated credentials", async () => {
    signInWithEmailAndPassword.mockResolvedValue({});

    await loginWithEmail({ email: "willy@example.com", password: "secure-password" });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      "firebase-auth",
      "willy@example.com",
      "secure-password",
    );
  });

  it("returns the same safe message for Firebase failures", async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error("auth/user-not-found"));

    await expect(
      loginWithEmail({ email: "willy@example.com", password: "secure-password" }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Não foi possível entrar agora. Verifique seus dados e tente novamente.",
        name: LoginError.name,
      }),
    );
  });
});
