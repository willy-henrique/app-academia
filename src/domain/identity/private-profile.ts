import { z } from "zod";

import {
  createDefaultOnboardingDraft,
  onboardingDraftSchema,
} from "@/domain/onboarding/onboarding";

export const privateProfileSchema = z.object({
  birthDate: z.string().date().nullable(),
  createdAt: z.unknown().optional(),
  activeWorkoutPlanId: z.string().trim().min(1).max(120).nullable().default(null),
  activeWorkoutSessionId: z.string().trim().min(1).max(120).nullable().default(null),
  onboarding: onboardingDraftSchema.default(createDefaultOnboardingDraft()),
  locale: z.string().trim().min(2).max(16),
  onboardingVersion: z.number().int().nonnegative(),
  preferences: z.object({
    simplifiedMode: z.boolean().default(false),
    weekStartsOn: z.enum(["monday", "sunday"]).default("monday"),
  }),
  timezone: z.string().trim().min(1).max(64),
  updatedAt: z.unknown().optional(),
});

export type PrivateProfile = z.infer<typeof privateProfileSchema>;
