import { httpsCallable } from "firebase/functions";
import { z } from "zod";

import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

import {
  publicProfilePreviewSchema,
  type PublicProfilePreview,
} from "@/domain/identity/public-profile";
import { normalizePublicUserId } from "@/domain/identity/public-user-id";

export const resolvePublicUserIdInputSchema = z.object({
  publicUserId: z.string().trim().min(1),
});

export type ResolvePublicUserIdInput = z.infer<typeof resolvePublicUserIdInputSchema>;

export async function resolvePublicUserId(
  input: ResolvePublicUserIdInput,
): Promise<PublicProfilePreview> {
  const { publicUserId } = resolvePublicUserIdInputSchema.parse(input);
  const normalizedPublicUserId = normalizePublicUserId(publicUserId);

  if (!/^WT[A-Z0-9]{8}$/.test(normalizedPublicUserId)) {
    throw new Error("Informe um WillTreino ID válido.");
  }

  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ publicUserId: string }, PublicProfilePreview>(
    functions,
    "resolvePublicUserId",
  );
  const result = await callable({ publicUserId: normalizedPublicUserId });

  return publicProfilePreviewSchema.parse(result.data);
}
