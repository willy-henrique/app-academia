import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

if (!emulatorHost) {
  throw new Error("Storage integration tests must run through Firebase Emulator Suite.");
}

const [host, port] = emulatorHost.split(":");
let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: "willtreino-local",
    storage: {
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await testEnvironment?.cleanup();
});

describe("Storage rules baseline", () => {
  it("allows owners to upload avatars and blocks other users from private progress files", async () => {
    const aliceStorage = testEnvironment.authenticatedContext("alice").storage();
    const bobStorage = testEnvironment.authenticatedContext("bob").storage();

    await expect(
      aliceStorage.ref().child("avatars/alice/avatar.png").putString("avatar", "raw", {
        contentType: "image/png",
      }),
    ).resolves.toBeDefined();

    await expect(
      aliceStorage.ref().child("progress/alice/progress.png").putString("progress", "raw", {
        contentType: "image/png",
      }),
    ).resolves.toBeDefined();

    await expect(
      bobStorage.ref().child("progress/alice/progress.png").putString("progress", "raw", {
        contentType: "image/png",
      }),
    ).rejects.toBeDefined();

    await expect(
      aliceStorage.ref().child("progress/alice/not-an-image.txt").putString("text", "raw", {
        contentType: "text/plain",
      }),
    ).rejects.toBeDefined();

    // Foto de progresso é privada: nem leitura de outra pessoa é permitida.
    await expect(
      bobStorage.ref().child("progress/alice/progress.png").getDownloadURL(),
    ).rejects.toBeDefined();
    await expect(
      aliceStorage.ref().child("progress/alice/progress.png").getDownloadURL(),
    ).resolves.toBeDefined();
    await expect(
      bobStorage.ref().child("progress/alice/progress.png").delete(),
    ).rejects.toBeDefined();
  });
});
