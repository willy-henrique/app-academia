// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("stays hidden from assistive technology and accepts fixed layout dimensions", () => {
    const { container } = render(<Skeleton className="h-20 w-full" data-testid="loading-card" />);

    const skeleton = container.querySelector("[data-testid='loading-card']");
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
    expect(skeleton?.className).toContain("h-20");
    expect(skeleton?.className).toContain("wt-skeleton");
  });
});
