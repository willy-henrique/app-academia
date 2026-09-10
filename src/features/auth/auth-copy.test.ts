import { describe, expect, it } from "vitest";

import { authCopy } from "./auth-copy";

describe("authCopy", () => {
  it("keeps recovery guidance generic and non-enumerable", () => {
    expect(authCopy.genericLoginFailure).toContain("Verifique seus dados");
    expect(authCopy.passwordResetNeutral).toContain("Se existir uma conta");
    expect(authCopy.googleConflictGuidance).toContain("Entre pelo método original");
  });

  it("does not promise an email verification step that the app never runs", () => {
    expect(authCopy.signupSuccess).not.toMatch(/verifica/i);
    expect(authCopy.signupSuccess).not.toMatch(/email/i);
  });
});
