import { beforeEach, describe, expect, it, vi } from "vitest";

const { createUserWithEmailAndPassword, getFirebaseClientServices } = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  getFirebaseClientServices: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import { signUpSchema, signUpWithEmail } from "./signup";

describe("signUpWithEmail", () => {
  beforeEach(() => {
    createUserWithEmailAndPassword.mockReset();
    getFirebaseClientServices.mockReset();
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
  });

  it("validates confirmation before reaching Firebase", async () => {
    const result = signUpSchema.safeParse({
      confirmPassword: "different-password",
      email: "willy@example.com",
      password: "correct-password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("creates the account with the validated email and password", async () => {
    createUserWithEmailAndPassword.mockResolvedValue({});

    await signUpWithEmail({
      confirmPassword: "very-secure-password",
      email: "willy@example.com",
      password: "very-secure-password",
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      "firebase-auth",
      "willy@example.com",
      "very-secure-password",
    );
  });

  it("accepts Firebase's minimum password length of six characters", () => {
    expect(
      signUpSchema.safeParse({
        confirmPassword: "123456",
        displayName: "Willy",
        email: "willy@example.com",
        password: "123456",
      }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        confirmPassword: "12345",
        displayName: "Willy",
        email: "willy@example.com",
        password: "12345",
      }).success,
    ).toBe(false);
  });

  it("maps expected Firebase failures to actionable, non-sensitive guidance", async () => {
    createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });

    await expect(
      signUpWithEmail({
        confirmPassword: "very-secure-password",
        email: "willy@example.com",
        password: "very-secure-password",
      }),
    ).rejects.toMatchObject({
      message: "Este email já possui uma conta. Entre ou redefina sua senha.",
      name: "SignUpError",
    });

    createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/operation-not-allowed" });
    await expect(
      signUpWithEmail({
        confirmPassword: "very-secure-password",
        email: "willy@example.com",
        password: "very-secure-password",
      }),
    ).rejects.toMatchObject({ message: /cadastro por email ainda não está disponível/ });
  });
});
