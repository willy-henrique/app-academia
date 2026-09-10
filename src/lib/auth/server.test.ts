import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseAdminServices } = vi.hoisted(() => ({
  getFirebaseAdminServices: vi.fn(),
}));

vi.mock("@/infrastructure/firebase/admin", () => ({ getFirebaseAdminServices }));

import {
  InvalidFirebaseAuthTokenError,
  MissingFirebaseAuthTokenError,
  readFirebaseBearerToken,
  requireFirebaseAuth,
  verifyFirebaseIdToken,
} from "./server";

describe("server auth helpers", () => {
  beforeEach(() => {
    getFirebaseAdminServices.mockReset();
  });

  it("reads a bearer token from the Authorization header", () => {
    expect(readFirebaseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(readFirebaseBearerToken("bearer token")).toBe("token");
    expect(readFirebaseBearerToken("Basic token")).toBeNull();
    expect(readFirebaseBearerToken(null)).toBeNull();
  });

  it("requires a bearer token before hitting Firebase Admin", async () => {
    await expect(requireFirebaseAuth({ get: () => null })).rejects.toBeInstanceOf(
      MissingFirebaseAuthTokenError,
    );
    expect(getFirebaseAdminServices).not.toHaveBeenCalled();
  });

  it("verifies a bearer token with Firebase Admin", async () => {
    const verifyIdToken = vi.fn().mockResolvedValue({ uid: "user-123" });
    getFirebaseAdminServices.mockReturnValue({
      auth: { verifyIdToken },
    });

    await expect(
      requireFirebaseAuth({
        get: (name) => (name === "authorization" ? "Bearer abc.def.ghi" : null),
      }),
    ).resolves.toEqual({ uid: "user-123" });

    expect(verifyIdToken).toHaveBeenCalledWith("abc.def.ghi", true);
  });

  it("hides the reason a token was rejected behind a generic error", async () => {
    const verifyIdToken = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("expired"), { code: "auth/id-token-expired" }));
    getFirebaseAdminServices.mockReturnValue({
      auth: { verifyIdToken },
    });

    const failure = await verifyFirebaseIdToken("abc.def.ghi").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidFirebaseAuthTokenError);
    expect((failure as Error).message).not.toContain("expired");
  });

  it("does not disguise a server credential failure as an invalid token", async () => {
    // Sem credencial de Admin o `verifyIdToken` falha por infraestrutura, não
    // porque o token é ruim. Chamar isso de "token inválido" manda o usuário
    // relogar para sempre e esconde a configuração faltando.
    const verifyIdToken = vi
      .fn()
      .mockRejectedValue(new Error("Could not load the default credentials"));
    getFirebaseAdminServices.mockReturnValue({
      auth: { verifyIdToken },
    });

    await expect(verifyFirebaseIdToken("abc.def.ghi")).rejects.not.toBeInstanceOf(
      InvalidFirebaseAuthTokenError,
    );
  });
});
