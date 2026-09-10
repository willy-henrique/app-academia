import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  initializeApp as initializeAdminApp,
  deleteApp as deleteAdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterEach, describe, expect, it } from "vitest";

import { normalizePublicUserId } from "@/domain/identity/public-user-id";

const authEmulatorUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const functionsEmulatorHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1";
const functionsEmulatorPort = Number(process.env.FIREBASE_FUNCTIONS_EMULATOR_PORT ?? "5001");
let app: FirebaseApp | undefined;
let adminApp: ReturnType<typeof initializeAdminApp> | undefined;

async function waitForDocument(path: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const snapshot = await getAdminFirestore(adminApp).doc(path).get();
    if (snapshot.exists) {
      return snapshot;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Document not found: ${path}`);
}

afterEach(async () => {
  if (app) {
    await deleteApp(app);
    app = undefined;
  }
  if (adminApp) {
    await deleteAdminApp(adminApp);
    adminApp = undefined;
  }
});

describe("identity foundation", () => {
  it(
    "creates separated public and private profiles for a new auth user",
    { timeout: 15000 },
    async () => {
      app = initializeApp(
        {
          apiKey: "emulator-api-key",
          appId: "willtreino-identity-integration",
          authDomain: "willtreino-local.firebaseapp.com",
          projectId: "willtreino-local",
        },
        `identity-${crypto.randomUUID()}`,
      );
      adminApp = initializeAdminApp({
        projectId: "willtreino-local",
      });

      const auth = getAuth(app);
      connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });

      const email = `identity-${crypto.randomUUID()}@willtreino.test`;
      const credential = await createUserWithEmailAndPassword(auth, email, "very-secure-password");

      const publicProfile = await waitForDocument(`publicProfiles/${credential.user.uid}`);
      const privateProfile = await waitForDocument(`privateProfiles/${credential.user.uid}`);

      expect(publicProfile.data()?.publicUserId).toMatch(/^WT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(publicProfile.data()?.displayName).toBeTruthy();
      expect(publicProfile.data()?.avatar ?? null).toBeNull();
      expect(privateProfile.data()?.timezone).toBe("America/Sao_Paulo");

      const normalizedPublicUserId = normalizePublicUserId(publicProfile.data()?.publicUserId);
      const indexSnapshot = await waitForDocument(`publicUserIdIndex/${normalizedPublicUserId}`);
      expect(indexSnapshot.data()?.uid).toBe(credential.user.uid);
    },
  );

  it("resolves a public user id through the callable function", { timeout: 15000 }, async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-identity-callable",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `identity-callable-${crypto.randomUUID()}`,
    );
    adminApp = initializeAdminApp({
      projectId: "willtreino-local",
    });

    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    const functions = getFunctions(app, "southamerica-east1");
    connectFunctionsEmulator(functions, functionsEmulatorHost, functionsEmulatorPort);

    const email = `lookup-${crypto.randomUUID()}@willtreino.test`;
    const credential = await createUserWithEmailAndPassword(auth, email, "very-secure-password");

    const publicProfileSnapshot = await waitForDocument(`publicProfiles/${credential.user.uid}`);
    const publicUserId = publicProfileSnapshot.data()?.publicUserId;

    const resolvePublicUserId = httpsCallable(functions, "resolvePublicUserId");
    const result = await resolvePublicUserId({ publicUserId });

    expect(result.data).toEqual({
      accountState: "ACTIVE",
      avatar: null,
      displayName: publicProfileSnapshot.data()?.displayName,
      publicUserId,
    });
  });

  it("rate limits repeated public user id lookups", { timeout: 20000 }, async () => {
    app = initializeApp(
      {
        apiKey: "emulator-api-key",
        appId: "willtreino-identity-rate-limit",
        authDomain: "willtreino-local.firebaseapp.com",
        projectId: "willtreino-local",
      },
      `identity-rate-limit-${crypto.randomUUID()}`,
    );
    adminApp = initializeAdminApp({
      projectId: "willtreino-local",
    });

    const auth = getAuth(app);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    const functions = getFunctions(app, "southamerica-east1");
    connectFunctionsEmulator(functions, functionsEmulatorHost, functionsEmulatorPort);

    const email = `ratelimit-${crypto.randomUUID()}@willtreino.test`;
    const credential = await createUserWithEmailAndPassword(auth, email, "very-secure-password");

    const publicProfileSnapshot = await waitForDocument(`publicProfiles/${credential.user.uid}`);
    const publicUserId = publicProfileSnapshot.data()?.publicUserId;
    const resolvePublicUserId = httpsCallable(functions, "resolvePublicUserId");

    await expect(resolvePublicUserId({ publicUserId })).resolves.toMatchObject({
      data: expect.objectContaining({ publicUserId }),
    });
    await expect(resolvePublicUserId({ publicUserId })).resolves.toMatchObject({
      data: expect.objectContaining({ publicUserId }),
    });
    await expect(resolvePublicUserId({ publicUserId })).resolves.toMatchObject({
      data: expect.objectContaining({ publicUserId }),
    });
    await expect(resolvePublicUserId({ publicUserId })).rejects.toMatchObject({
      code: expect.stringContaining("resource-exhausted"),
    });
  });
});
