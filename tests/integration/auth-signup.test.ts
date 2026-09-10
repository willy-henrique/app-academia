import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";
import { afterEach, describe, expect, it } from "vitest";

const authEmulatorUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
let app: FirebaseApp | undefined;

afterEach(async () => {
  if (app) {
    await deleteApp(app);
    app = undefined;
  }
});

describe("Firebase Auth Emulator signup", () => {
  it("creates an email/password account in the local emulator", async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-auth-integration",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `auth-signup-${crypto.randomUUID()}`,
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });

    const credential = await createUserWithEmailAndPassword(
      auth,
      `signup-${crypto.randomUUID()}@willtreino.test`,
      "very-secure-password",
    );

    expect(credential.user.emailVerified).toBe(false);

    await deleteUser(credential.user);
    await signOut(auth);
  });
});
