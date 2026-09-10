import { describe, expect, it } from "vitest";

import { resolveRuntimeEnvironment } from "./environment";

describe("resolveRuntimeEnvironment", () => {
  it("requires emulators for test", () => {
    expect(() => resolveRuntimeEnvironment({ appEnvironment: "test" })).toThrow(
      "must use Firebase emulators",
    );
  });

  it("allows an isolated test environment", () => {
    expect(
      resolveRuntimeEnvironment({ appEnvironment: "test", useFirebaseEmulators: "true" }),
    ).toEqual({ name: "test", useFirebaseEmulators: true });
  });

  it("prevents emulators in staging and production", () => {
    expect(() =>
      resolveRuntimeEnvironment({ appEnvironment: "production", useFirebaseEmulators: "true" }),
    ).toThrow("cannot use Firebase emulators");
  });
});
