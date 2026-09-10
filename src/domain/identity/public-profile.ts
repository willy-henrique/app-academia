import { z } from "zod";

import { isPublicUserId } from "./public-user-id";

export const publicProfileSchema = z.object({
  avatar: z.string().trim().min(1).max(2048).nullable(),
  badgesPublic: z.array(z.string().trim().min(1).max(64)).default([]),
  createdAt: z.unknown().optional(),
  displayName: z.string().trim().min(1).max(60),
  publicUserId: z.string().refine(isPublicUserId, "Informe um WillTreino ID válido."),
  username: z.string().trim().min(3).max(24).nullable(),
  updatedAt: z.unknown().optional(),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const publicProfilePreviewSchema = z.object({
  accountState: z.literal("ACTIVE"),
  avatar: z.string().trim().min(1).max(2048).nullable(),
  displayName: z.string().trim().min(1).max(60),
  publicUserId: z.string().refine(isPublicUserId, "Informe um WillTreino ID válido."),
});

export type PublicProfilePreview = z.infer<typeof publicProfilePreviewSchema>;
