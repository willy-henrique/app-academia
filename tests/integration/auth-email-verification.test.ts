import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendEmailVerification,
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

describe("Firebase Auth Emulator email verification", () => {
  it("accepts a verification email request for the authenticated user", async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-auth-verification-integration",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `auth-verification-${crypto.randomUUID()}`,
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    const credential = await createUserWithEmailAndPassword(
      auth,
      `verify-${crypto.randomUUID()}@willtreino.test`,
      "very-secure-password",
    );

    await expect(sendEmailVerification(credential.user)).resolves.toBeUndefined();
    await deleteUser(credential.user);
    await signOut(auth);
  });
});
