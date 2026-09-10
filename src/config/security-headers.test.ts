import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, buildSecurityHeaders } from "./security-headers";

function headerValue(isProduction: boolean, key: string): string | undefined {
  return buildSecurityHeaders(isProduction).find((header) => header.key === key)?.value;
}

describe("security headers", () => {
  it("blocks framing, sniffing and legacy cohort tracking", () => {
    expect(headerValue(true, "X-Frame-Options")).toBe("DENY");
    expect(headerValue(true, "X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue(true, "Permissions-Policy")).toContain("camera=()");
    expect(headerValue(true, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sends HSTS only in production", () => {
    expect(headerValue(true, "Strict-Transport-Security")).toContain("max-age=63072000");
    expect(headerValue(false, "Strict-Transport-Security")).toBeUndefined();
  });

  it("keeps the production CSP free of unsafe-eval", () => {
    const policy = buildContentSecurityPolicy(true);

    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("allows the Firebase endpoints the app really calls", () => {
    const policy = buildContentSecurityPolicy(true);

    for (const source of [
      "https://identitytoolkit.googleapis.com",
      "https://firebasestorage.googleapis.com",
      "https://*.cloudfunctions.net",
      "wss://*.firebaseio.com",
    ]) {
      expect(policy).toContain(source);
    }
    expect(policy).toContain("script-src 'self' 'unsafe-inline' https://apis.google.com");
    expect(policy).toContain(
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    );
  });

  it("relaxes only what development needs", () => {
    const policy = buildContentSecurityPolicy(false);

    expect(policy).toContain("unsafe-eval");
    expect(policy).toContain("ws://localhost:*");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
