import { describe, expect, it } from "vitest";

import {
  formatPublicUserId,
  generatePublicUserId,
  isPublicUserId,
  normalizePublicUserId,
} from "./public-user-id";

describe("publicUserId helpers", () => {
  it("normalizes and formats the public user id", () => {
    expect(normalizePublicUserId(" wt-7fk3-q9lp ")).toBe("WT7FK3Q9LP");
    expect(formatPublicUserId("WT7FK3Q9LP")).toBe("WT-7FK3-Q9LP");
    expect(isPublicUserId("WT-7FK3-Q9LP")).toBe(true);
  });

  it("generates a formatted public user id", () => {
    const generated = generatePublicUserId(() => 0);

    expect(generated).toBe("WT-AAAA-AAAA");
    expect(isPublicUserId(generated)).toBe(true);
  });
});
