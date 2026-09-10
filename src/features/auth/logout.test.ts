import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, signOut } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/auth", () => ({ signOut }));
vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import { logoutFromFirebase } from "./logout";

describe("logoutFromFirebase", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    signOut.mockReset();
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
  });

  it("signs out the current Firebase session", async () => {
    signOut.mockResolvedValue(undefined);

    await logoutFromFirebase();

    expect(signOut).toHaveBeenCalledWith("firebase-auth");
  });

  it("keeps the response generic when sign out fails", async () => {
    signOut.mockRejectedValue(new Error("network-error"));

    await expect(logoutFromFirebase()).rejects.toThrow(
      "Não foi possível sair agora. Tente novamente.",
    );
  });
});
