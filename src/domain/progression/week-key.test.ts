import { describe, expect, it } from "vitest";

import { listRecentWeekKeys, resolveWeekKey, resolveWeekWindow } from "./week-key";

describe("week keys", () => {
  it("starts the Brazilian week on Monday by default", () => {
    // 2026-09-09T12:00Z is Wednesday 09:00 in São Paulo.
    const window = resolveWeekWindow(new Date("2026-09-09T12:00:00.000Z"));
    expect(window.key).toBe("2026-09-07");
    expect(window.startsAt).toBe("2026-09-07T03:00:00.000Z");
    expect(window.endsAt).toBe("2026-09-14T03:00:00.000Z");
    expect(window.weekStartsOn).toBe("monday");
  });

  it("supports weeks starting on Sunday", () => {
    expect(resolveWeekKey(new Date("2026-09-09T12:00:00.000Z"), { weekStartsOn: "sunday" })).toBe(
      "2026-09-06",
    );
  });

  it("uses the person's timezone, not the server clock", () => {
    // Monday 00:30 in São Paulo is still Sunday 21:30 in Los Angeles.
    const instant = new Date("2026-09-07T03:30:00.000Z");
    expect(resolveWeekKey(instant, { timeZone: "America/Sao_Paulo" })).toBe("2026-09-07");
    expect(resolveWeekKey(instant, { timeZone: "America/Los_Angeles" })).toBe("2026-08-31");
    expect(resolveWeekKey(instant, { timeZone: "UTC" })).toBe("2026-09-07");
  });

  it("keeps the week boundary on local midnight across a DST change", () => {
    // Europe/Lisbon leaves DST on 2026-10-25.
    const window = resolveWeekWindow(new Date("2026-10-28T12:00:00.000Z"), {
      timeZone: "Europe/Lisbon",
    });
    expect(window.key).toBe("2026-10-26");
    expect(window.startsAt).toBe("2026-10-26T00:00:00.000Z");
    expect(window.endsAt).toBe("2026-11-02T00:00:00.000Z");
  });

  it("classifies the first and last moment of a week consistently", () => {
    const window = resolveWeekWindow(new Date("2026-09-09T12:00:00.000Z"));
    expect(resolveWeekKey(new Date(window.startsAt))).toBe(window.key);
    expect(resolveWeekKey(new Date(new Date(window.endsAt).getTime() - 1))).toBe(window.key);
    expect(resolveWeekKey(new Date(window.endsAt))).not.toBe(window.key);
  });

  it("lists recent weeks newest first", () => {
    expect(listRecentWeekKeys(new Date("2026-09-09T12:00:00.000Z"), 3)).toEqual([
      "2026-09-07",
      "2026-08-31",
      "2026-08-24",
    ]);
  });
});
