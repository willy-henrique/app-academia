import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
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

describe("Firebase Auth Emulator password reset", () => {
  it("accepts a reset request for an email/password account", async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-auth-reset-integration",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `auth-reset-${crypto.randomUUID()}`,
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    const email = `reset-${crypto.randomUUID()}@willtreino.test`;
    const credential = await createUserWithEmailAndPassword(auth, email, "very-secure-password");

    await expect(sendPasswordResetEmail(auth, email)).resolves.toBeUndefined();
    await deleteUser(credential.user);
    await signOut(auth);
  });
});
