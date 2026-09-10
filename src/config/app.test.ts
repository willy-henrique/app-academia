import { describe, expect, it } from "vitest";

import { appIdentity } from "./app";

describe("appIdentity", () => {
  it("defines the immutable product identity", () => {
    expect(appIdentity).toEqual({
      name: "WillTreino",
      locale: "pt-BR",
    });
  });
});
