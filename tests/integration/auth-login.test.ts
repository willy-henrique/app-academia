import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
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

describe("Firebase Auth Emulator login", () => {
  it("starts a session for an existing email/password account", async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-auth-login-integration",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `auth-login-${crypto.randomUUID()}`,
    );
    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    const email = `login-${crypto.randomUUID()}@willtreino.test`;
    const password = "very-secure-password";
    const created = await createUserWithEmailAndPassword(auth, email, password);

    await signOut(auth);
    const credential = await signInWithEmailAndPassword(auth, email, password);

    expect(credential.user.uid).toBe(created.user.uid);

    await deleteUser(credential.user);
    await signOut(auth);
  });
});
