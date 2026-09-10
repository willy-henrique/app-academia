"use client";

import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { z } from "zod";

import {
  groupParticipantSchema,
  groupParticipantOperationalStateOptions,
  groupSessionSchema,
  groupSessionStatusOptions,
  type GroupLobbyConfiguration,
  type GroupParticipant,
  type GroupSession,
} from "@/domain/group/group-session";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

function timestampToIso(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return value;
}

function parseParticipant(data: unknown): GroupParticipant | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  const parsed = groupParticipantSchema.safeParse({
    ...candidate,
    completedAt: timestampToIso(candidate.completedAt),
    leftAt: timestampToIso(candidate.leftAt),
    operationalStateUpdatedAt: timestampToIso(candidate.operationalStateUpdatedAt),
    readyAt: timestampToIso(candidate.readyAt),
  });

  return parsed.success ? parsed.data : null;
}

function parseSession(data: unknown): GroupSession | null {
  const parsed = groupSessionSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export type GroupLobbySnapshot = Readonly<{
  participants: GroupParticipant[];
  session: GroupSession;
}>;

export interface GroupLobbySubscriptionOptions {
  onError?: (error: Error) => void;
}

const startGroupSessionResultSchema = z.object({
  countdownSeconds: z.number().int().min(3).max(10),
  sessionId: z.string().trim().min(1),
  startAt: z.string().datetime(),
  status: z.enum(["COUNTDOWN", "ACTIVE"]),
});

export type StartGroupSessionResult = z.infer<typeof startGroupSessionResultSchema>;

const activateGroupSessionResultSchema = z.object({
  sessionId: z.string().trim().min(1),
  startAt: z.string().datetime(),
  status: z.literal("ACTIVE"),
});

const completeGroupParticipationResultSchema = z.object({
  participantStatus: z.literal("COMPLETED"),
  sessionId: z.string().trim().min(1),
  sessionStatus: z.enum(groupSessionStatusOptions),
});

export type CompleteGroupParticipationResult = z.infer<
  typeof completeGroupParticipationResultSchema
>;

const groupParticipantOperationalStateSchema = z.enum(groupParticipantOperationalStateOptions);

export type ActivateGroupSessionResult = z.infer<typeof activateGroupSessionResultSchema>;
export type GroupParticipantOperationalState = z.infer<
  typeof groupParticipantOperationalStateSchema
>;

export function subscribeToGroupLobby(
  sessionId: string,
  onChange: (snapshot: GroupLobbySnapshot | null) => void,
  options: GroupLobbySubscriptionOptions = {},
): () => void {
  const { firestore } = getFirebaseClientServices();
  const sessionRef = doc(firestore, "groupSessions", sessionId);
  let session: GroupSession | null = null;
  let participants: GroupParticipant[] = [];

  function notify() {
    onChange(session ? { participants, session } : null);
  }

  const unsubscribeSession = onSnapshot(
    sessionRef,
    (snapshot) => {
      session = snapshot.exists() ? parseSession(snapshot.data()) : null;
      notify();
    },
    (error) => options.onError?.(error instanceof Error ? error : new Error("group-lobby-failed")),
  );
  const unsubscribeParticipants = onSnapshot(
    collection(sessionRef, "participants"),
    (snapshot) => {
      participants = snapshot.docs
        .map((document) => parseParticipant(document.data()))
        .filter((participant): participant is GroupParticipant => participant !== null)
        .sort((left, right) =>
          left.displaySnapshot.displayName.localeCompare(right.displaySnapshot.displayName),
        );
      notify();
    },
    (error) =>
      options.onError?.(error instanceof Error ? error : new Error("group-members-failed")),
  );

  return () => {
    unsubscribeSession();
    unsubscribeParticipants();
  };
}

export async function saveGroupLobbyConfiguration(
  sessionId: string,
  configuration: GroupLobbyConfiguration,
): Promise<void> {
  const { firestore } = getFirebaseClientServices();
  await updateDoc(doc(firestore, "groupSessions", sessionId), {
    sharedEquipmentMode: configuration.sharedEquipmentMode,
    stationMode: configuration.stationMode,
    updatedAt: serverTimestamp(),
    weightChangeMode: configuration.weightChangeMode,
    weightChangeSeconds:
      configuration.weightChangeMode === "CUSTOM"
        ? (configuration.weightChangeSeconds ?? null)
        : null,
  });
}

export async function setGroupLobbyReady(
  sessionId: string,
  uid: string,
  ready: boolean,
): Promise<void> {
  const { firestore } = getFirebaseClientServices();
  await updateDoc(doc(firestore, "groupSessions", sessionId, "participants", uid), {
    readyAt: ready ? serverTimestamp() : null,
    status: ready ? "READY" : "INVITED",
  });
}

export async function startGroupSessionRequest(
  sessionId: string,
): Promise<StartGroupSessionResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ sessionId: string }, unknown>(functions, "startGroupSession");
  const result = await callable({ sessionId });
  return startGroupSessionResultSchema.parse(result.data);
}

export async function activateGroupSessionRequest(
  sessionId: string,
): Promise<ActivateGroupSessionResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ sessionId: string }, unknown>(functions, "activateGroupSession");
  const result = await callable({ sessionId });
  return activateGroupSessionResultSchema.parse(result.data);
}

export async function leaveGroupSessionRequest(sessionId: string): Promise<void> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ sessionId: string }, unknown>(functions, "leaveGroupSession");
  await callable({ sessionId });
}

export async function completeGroupParticipationRequest(
  sessionId: string,
): Promise<CompleteGroupParticipationResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ sessionId: string }, unknown>(
    functions,
    "completeGroupParticipation",
  );
  const result = await callable({ sessionId });
  return completeGroupParticipationResultSchema.parse(result.data);
}

export async function setGroupParticipantOperationalState(
  sessionId: string,
  state: GroupParticipantOperationalState,
): Promise<void> {
  const { auth, firestore } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para atualizar o status do treino.");
  }

  await updateDoc(doc(firestore, "groupSessions", sessionId, "participants", uid), {
    operationalState: groupParticipantOperationalStateSchema.parse(state),
    operationalStateUpdatedAt: serverTimestamp(),
  });
}
