import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const requiredVariables = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

describe(".env.example", () => {
  it("documents required Firebase variables without secret values", () => {
    const content = readFileSync(".env.example", "utf8");

    for (const variableName of requiredVariables) {
      expect(content).toContain(`${variableName}=`);
      expect(content).not.toMatch(new RegExp(`${variableName}=.+`));
    }

    expect(content).not.toContain("BEGIN PRIVATE KEY");
  });
});
