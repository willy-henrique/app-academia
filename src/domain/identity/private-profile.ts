import { z } from "zod";

import {
  createDefaultOnboardingDraft,
  onboardingDraftSchema,
} from "@/domain/onboarding/onboarding";

export const privateProfileSchema = z.object({
  birthDate: z.string().date().nullable().default(null),
  createdAt: z.unknown().optional(),
  activeWorkoutPlanId: z.string().trim().min(1).max(120).nullable().default(null),
  activeWorkoutSessionId: z.string().trim().min(1).max(120).nullable().default(null),
  onboarding: onboardingDraftSchema.default(createDefaultOnboardingDraft()),
  locale: z.string().trim().min(2).max(16).default("pt-BR"),
  onboardingVersion: z.number().int().nonnegative().default(0),
  preferences: z
    .object({
      simplifiedMode: z.boolean().default(false),
      weekStartsOn: z.enum(["monday", "sunday"]).default("monday"),
    })
    .default({ simplifiedMode: false, weekStartsOn: "monday" }),
  timezone: z.string().trim().min(1).max(64).default("America/Sao_Paulo"),
  updatedAt: z.unknown().optional(),
});

export type PrivateProfile = z.infer<typeof privateProfileSchema>;
