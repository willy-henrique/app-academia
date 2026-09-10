import { describe, expect, it } from "vitest";

import { designTokens } from "./design-tokens";

describe("designTokens", () => {
  it("exposes the required semantic product colors", () => {
    expect(Object.keys(designTokens.color)).toEqual(
      expect.arrayContaining([
        "background",
        "surface",
        "surfaceElevated",
        "border",
        "textPrimary",
        "textSecondary",
        "accent",
        "success",
        "warning",
        "danger",
        "focus",
      ]),
    );
  });

  it("references CSS variables instead of literal colors", () => {
    expect(Object.values(designTokens.color).every((token) => token.startsWith("var(--wt-"))).toBe(
      true,
    );
  });

  it("keeps typography semantic and CSS-variable based", () => {
    expect(
      Object.values(designTokens.typography).every((token) => token.startsWith("var(--wt-")),
    ).toBe(true);
  });
});
