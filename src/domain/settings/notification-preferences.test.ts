import { describe, expect, it } from "vitest";

import {
  defaultNotificationPreferences,
  notificationPreferencesSchema,
} from "./notification-preferences";

describe("notification preferences", () => {
  it("uses the in-app reminder by default", () => {
    expect(notificationPreferencesSchema.parse({})).toEqual(defaultNotificationPreferences);
  });

  it("rejects non-boolean reminder values", () => {
    expect(() => notificationPreferencesSchema.parse({ showWeeklyGoalReminder: "yes" })).toThrow();
  });
});
