// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useReducedMotion } from "./use-reduced-motion";

function PreferenceProbe() {
  const reducedMotion = useReducedMotion();
  return <output>{reducedMotion ? "reduce" : "no-preference"}</output>;
}

describe("useReducedMotion", () => {
  it("reads the system motion preference", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        addEventListener: () => undefined,
        matches: true,
        removeEventListener: () => undefined,
      }),
    });

    const { getByText } = render(<PreferenceProbe />);
    expect(getByText("reduce")).toBeTruthy();
  });
});
