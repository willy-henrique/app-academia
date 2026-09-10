import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, httpsCallable } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

import { resolvePublicUserId } from "./resolve-public-user-id";

describe("resolvePublicUserId", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    httpsCallable.mockReset();
    getFirebaseClientServices.mockReturnValue({ functions: "firebase-functions" });
  });

  it("normalizes the lookup input and returns the public preview", async () => {
    const callable = vi.fn().mockResolvedValue({
      data: {
        accountState: "ACTIVE",
        avatar: null,
        displayName: "Willy",
        publicUserId: "WT-7FK3-Q9LP",
      },
    });
    httpsCallable.mockReturnValue(callable);

    await expect(resolvePublicUserId({ publicUserId: " wt-7fk3-q9lp " })).resolves.toEqual({
      accountState: "ACTIVE",
      avatar: null,
      displayName: "Willy",
      publicUserId: "WT-7FK3-Q9LP",
    });

    expect(callable).toHaveBeenCalledWith({ publicUserId: "WT7FK3Q9LP" });
  });
});
