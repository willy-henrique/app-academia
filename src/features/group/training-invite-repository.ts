"use client";

import {
  collection,
  limit as limitQuery,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { z } from "zod";

import {
  resolveTrainingInviteStatus,
  trainingInviteSchema,
  type TrainingInvite,
} from "@/domain/group/training-invite";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const trainingInvitesCollection = "trainingInvites";
const defaultInviteQueryLimit = 50;

export const sendTrainingInviteInputSchema = z
  .object({
    receiverPublicUserId: z.string().trim().min(1).optional(),
    receiverUid: z.string().trim().min(1).optional(),
    workoutPlanId: z.string().trim().min(1),
    workoutPlanVersionId: z.string().trim().min(1),
  })
  .refine((value) => Boolean(value.receiverPublicUserId ?? value.receiverUid), {
    message: "Informe o WillTreino ID do parceiro.",
    path: ["receiverPublicUserId"],
  });

export type SendTrainingInviteInput = z.infer<typeof sendTrainingInviteInputSchema>;

export const sendTrainingInviteResultSchema = z.object({
  expiresAt: z.string(),
  inviteId: z.string(),
  status: z.literal("PENDING"),
});

export type SendTrainingInviteResult = z.infer<typeof sendTrainingInviteResultSchema>;

export const trainingInviteResponseActionOptions = ["ACCEPT", "DECLINE", "CANCEL"] as const;
export type TrainingInviteResponseAction = (typeof trainingInviteResponseActionOptions)[number];

export const respondToTrainingInviteResultSchema = z.object({
  groupSessionId: z.string().nullable(),
  inviteId: z.string(),
  status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED"]),
});

export type RespondToTrainingInviteResult = z.infer<typeof respondToTrainingInviteResultSchema>;

export async function sendTrainingInviteRequest(
  input: SendTrainingInviteInput,
): Promise<SendTrainingInviteResult> {
  const payload = sendTrainingInviteInputSchema.parse(input);
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<SendTrainingInviteInput, unknown>(functions, "sendTrainingInvite");
  const result = await callable(payload);

  return sendTrainingInviteResultSchema.parse(result.data);
}

export async function respondToTrainingInviteRequest(
  inviteId: string,
  action: TrainingInviteResponseAction,
): Promise<RespondToTrainingInviteResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<
    { action: TrainingInviteResponseAction; inviteId: string },
    unknown
  >(functions, "respondToTrainingInvite");
  const result = await callable({ action, inviteId });

  return respondToTrainingInviteResultSchema.parse(result.data);
}

export async function pruneExpiredTrainingInvitesRequest(): Promise<{ expired: number }> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<Record<string, never>, unknown>(
    functions,
    "pruneExpiredTrainingInvites",
  );
  const result = await callable({});

  return z.object({ expired: z.number().int().nonnegative() }).parse(result.data);
}

type InviteDirection = "incoming" | "outgoing";

function inviteQuery(direction: InviteDirection, uid: string) {
  const { firestore } = getFirebaseClientServices();
  const field = direction === "incoming" ? "receiverUid" : "senderUid";

  return query(
    collection(firestore, trainingInvitesCollection),
    where(field, "==", uid),
    where("status", "==", "PENDING"),
    orderBy("createdAt", "desc"),
    limitQuery(defaultInviteQueryLimit),
  );
}

function parseInviteSnapshot(data: unknown): TrainingInvite | null {
  const parsed = trainingInviteSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export interface SubscribeToTrainingInvitesOptions {
  now?: () => Date;
  onError?: (error: Error) => void;
}

/**
 * Live view of the invites still awaiting a decision. Expired-but-not-yet-swept
 * invites are filtered out client-side so the inbox never shows a dead invite.
 * Freshness is re-evaluated on every snapshot, not at subscribe time.
 */
export function subscribeToTrainingInvites(
  direction: InviteDirection,
  uid: string,
  onChange: (invites: TrainingInvite[]) => void,
  options: SubscribeToTrainingInvitesOptions = {},
): () => void {
  const nowProvider = options.now ?? (() => new Date());

  return onSnapshot(
    inviteQuery(direction, uid),
    (snapshot) => {
      const now = nowProvider();
      const invites = snapshot.docs
        .map((document) => parseInviteSnapshot(document.data()))
        .filter((invite): invite is TrainingInvite => invite !== null)
        .filter((invite) => resolveTrainingInviteStatus(invite, now) === "PENDING");

      onChange(invites);
    },
    (error) =>
      options.onError?.(error instanceof Error ? error : new Error("invite-subscription-failed")),
  );
}

export function subscribeToIncomingTrainingInvites(
  uid: string,
  onChange: (invites: TrainingInvite[]) => void,
  options: SubscribeToTrainingInvitesOptions = {},
): () => void {
  return subscribeToTrainingInvites("incoming", uid, onChange, options);
}

export function subscribeToOutgoingTrainingInvites(
  uid: string,
  onChange: (invites: TrainingInvite[]) => void,
  options: SubscribeToTrainingInvitesOptions = {},
): () => void {
  return subscribeToTrainingInvites("outgoing", uid, onChange, options);
}
