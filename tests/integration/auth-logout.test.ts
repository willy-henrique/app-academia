import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
}));

vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import { logoutFromFirebase } from "@/features/auth/logout";

const authEmulatorUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
let app: FirebaseApp | undefined;

afterEach(async () => {
  if (app) {
    await deleteApp(app);
    app = undefined;
  }
  vi.clearAllMocks();
});

describe("Firebase Auth Emulator logout", () => {
  it("signs the current user out through the client helper", async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-auth-logout-integration",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `auth-logout-${crypto.randomUUID()}`,
    );

    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    const email = `logout-${crypto.randomUUID()}@willtreino.test`;

    await createUserWithEmailAndPassword(auth, email, "very-secure-password");
    getFirebaseClientServices.mockReturnValue({
      app,
      auth,
      firestore: {} as never,
      storage: {} as never,
    });

    await logoutFromFirebase();

    expect(auth.currentUser).toBeNull();
  });
});
