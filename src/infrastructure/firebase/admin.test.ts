import { describe, expect, it } from "vitest";

import { readFirebaseAdminConfiguration } from "./admin";

describe("readFirebaseAdminConfiguration", () => {
  it("uses application default credentials when only the project is configured", () => {
    expect(readFirebaseAdminConfiguration({ projectId: "willtreino-dev" })).toEqual({
      projectId: "willtreino-dev",
    });
  });

  it("normalizes a service account private key supplied by environment variables", () => {
    expect(
      readFirebaseAdminConfiguration({
        projectId: "willtreino-dev",
        clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
        privateKey: "line-one\\nline-two",
      }),
    ).toEqual({
      projectId: "willtreino-dev",
      serviceAccount: {
        projectId: "willtreino-dev",
        clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
        privateKey: "line-one\nline-two",
      },
    });
  });

  it("rejects an incomplete service account", () => {
    expect(() =>
      readFirebaseAdminConfiguration({
        projectId: "willtreino-dev",
        clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
      }),
    ).toThrow("both clientEmail and privateKey");
  });
});
