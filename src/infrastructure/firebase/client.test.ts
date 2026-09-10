import { describe, expect, it } from "vitest";

import { readFirebaseClientConfig, type FirebaseClientEnvironment } from "./client";

const validEnvironment: FirebaseClientEnvironment = {
  apiKey: "public-api-key",
  authDomain: "willtreino.firebaseapp.com",
  projectId: "willtreino-dev",
  storageBucket: "willtreino-dev.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};

describe("readFirebaseClientConfig", () => {
  it("creates a Firebase configuration from the public environment", () => {
    expect(readFirebaseClientConfig(validEnvironment)).toEqual(validEnvironment);
  });

  it("rejects incomplete configuration before service initialization", () => {
    expect(() => readFirebaseClientConfig({ ...validEnvironment, projectId: undefined })).toThrow(
      "projectId",
    );
  });
});
