// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  endLocalDevelopmentSession,
  isLocalDevelopmentAuthEnabled,
  readLocalDevelopmentSession,
  startLocalDevelopmentSession,
  subscribeToLocalDevelopmentSession,
} from "./local-development-auth";

const originalAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE;
const originalAppEnvironment = process.env.NEXT_PUBLIC_APP_ENV;

describe("local development auth", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "local";
    process.env.NEXT_PUBLIC_APP_ENV = "development";
    window.localStorage.clear();
  });

  afterEach(() => {
    if (originalAuthMode === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_MODE;
    } else {
      process.env.NEXT_PUBLIC_AUTH_MODE = originalAuthMode;
    }
    if (originalAppEnvironment === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ENV;
    } else {
      process.env.NEXT_PUBLIC_APP_ENV = originalAppEnvironment;
    }
    window.localStorage.clear();
  });

  it("creates a local session without retaining the password", () => {
    expect(isLocalDevelopmentAuthEnabled()).toBe(true);

    const session = startLocalDevelopmentSession("Willy@Example.com");

    expect(session).toEqual({ email: "willy@example.com", uid: expect.stringMatching(/^local-/) });
    expect(readLocalDevelopmentSession()).toEqual(session);
    expect(JSON.stringify(window.localStorage)).not.toContain("senha");
  });

  it("publishes login and logout changes to the local session provider", () => {
    const snapshots: Array<string | null> = [];
    const unsubscribe = subscribeToLocalDevelopmentSession((session) => {
      snapshots.push(session?.email ?? null);
    });

    startLocalDevelopmentSession("willy@example.com");
    endLocalDevelopmentSession();
    unsubscribe();

    expect(snapshots).toEqual([null, "willy@example.com", null]);
  });
});
