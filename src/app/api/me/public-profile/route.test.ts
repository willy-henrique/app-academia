import { describe, expect, it, vi } from "vitest";

const { getFirebaseAdminServices, requireFirebaseAuth } = vi.hoisted(() => ({
  getFirebaseAdminServices: vi.fn(),
  requireFirebaseAuth: vi.fn(),
}));

vi.mock("@/lib/auth/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/server")>("@/lib/auth/server");
  return { ...actual, requireFirebaseAuth };
});
vi.mock("@/infrastructure/firebase/admin", () => ({ getFirebaseAdminServices }));

import { InvalidFirebaseAuthTokenError, MissingFirebaseAuthTokenError } from "@/lib/auth/server";
import { GET } from "./route";

function request(): Request {
  return new Request("http://localhost/api/me/public-profile", {
    headers: { authorization: "Bearer token" },
  });
}

describe("GET /api/me/public-profile", () => {
  it("returns existing public profile of the caller", async () => {
    requireFirebaseAuth.mockResolvedValue({ uid: "uid-1" });
    getFirebaseAdminServices.mockReturnValue({
      firestore: {
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({
              avatar: null,
              badgesPublic: [],
              createdAt: "2026-01-01T00:00:00.000Z",
              displayName: "Willy",
              publicUserId: "WT-A2B3-C4D5",
              updatedAt: "2026-01-01T00:00:00.000Z",
              username: null,
            }),
          }),
        }),
      },
    });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      displayName: "Willy",
      publicUserId: "WT-A2B3-C4D5",
    });
  });

  it("provisions a new public profile JIT when none exists", async () => {
    requireFirebaseAuth.mockResolvedValue({
      uid: "new-user-uid",
      name: "Atleta Novo",
      email: "novo@willtreino.com",
    });

    let profileDoc: unknown = null;
    const mockFirestore = {
      doc: (path: string) => ({
        get: async () => ({
          exists: path.startsWith("publicProfiles/") ? Boolean(profileDoc) : false,
          data: () => profileDoc,
        }),
      }),
      runTransaction: async (updateFn: (tx: unknown) => Promise<void>) => {
        const fakeTx = {
          get: async () => ({ exists: false }),
          set: (_docRef: unknown, data: unknown) => {
            profileDoc = data;
          },
        };
        await updateFn(fakeTx);
      },
    };

    getFirebaseAdminServices.mockReturnValue({ firestore: mockFirestore });

    const response = await GET(request());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.displayName).toBe("Atleta Novo");
    expect(json.publicUserId).toMatch(/^WT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(json.accountState).toBe("ACTIVE");
  });

  it("answers 401 only when the caller is not authenticated", async () => {
    requireFirebaseAuth.mockRejectedValue(new MissingFirebaseAuthTokenError());
    expect((await GET(request())).status).toBe(401);

    requireFirebaseAuth.mockRejectedValue(new InvalidFirebaseAuthTokenError());
    expect((await GET(request())).status).toBe(401);
  });

  it("answers 500 when the server itself is misconfigured", async () => {
    requireFirebaseAuth.mockResolvedValue({ uid: "uid-1" });
    getFirebaseAdminServices.mockImplementation(() => {
      throw new Error("Firebase Admin configuration is incomplete: projectId.");
    });

    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: "server_error" });
  });
});
