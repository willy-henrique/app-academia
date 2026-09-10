"use client";

import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { z } from "zod";

import {
  defaultWeekStartsOn,
  defaultWeekTimeZone,
  type WeekStartsOn,
} from "@/domain/progression/week-key";
import { weeklyStatsSchema, type WeeklyStats } from "@/domain/progression/weekly-stats";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const recordWorkoutCompletionResultSchema = z.object({
  credited: z.boolean(),
  sessionId: z.string().trim().min(1),
  weekKey: z.string().trim().min(1),
});

const rebuildWeeklyStatsResultSchema = z.object({
  events: z.number().int().nonnegative(),
  weekKey: z.string().trim().min(1),
});

export type RecordWorkoutCompletionResult = z.infer<typeof recordWorkoutCompletionResultSchema>;
export type RebuildWeeklyStatsResult = z.infer<typeof rebuildWeeklyStatsResultSchema>;

function weeksCollectionPath(uid: string): [string, string, string] {
  return ["weeklyStats", uid, "weeks"];
}

/**
 * Asks the server to credit a finished solo session. The client never writes
 * `weeklyStats`: the projection is server-writable only and idempotent.
 */
export async function recordWorkoutCompletionRequest(
  sessionId: string,
): Promise<RecordWorkoutCompletionResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ sessionId: string }, unknown>(
    functions,
    "recordWorkoutCompletion",
  );
  const result = await callable({ sessionId });
  return recordWorkoutCompletionResultSchema.parse(result.data);
}

export async function rebuildWeeklyStatsRequest(
  weekKey: string,
): Promise<RebuildWeeklyStatsResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ weekKey: string }, unknown>(functions, "rebuildWeeklyStats");
  const result = await callable({ weekKey });
  return rebuildWeeklyStatsResultSchema.parse(result.data);
}

export type WeekPreferences = Readonly<{
  plannedTarget: number;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}>;

/**
 * Reads the week configuration from the person's own private profile. The
 * dashboard must never derive weeks from the browser or server clock alone.
 */
export async function loadWeekPreferences(uid: string): Promise<WeekPreferences> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, "privateProfiles", uid));
  const data = (snapshot.data() ?? {}) as Record<string, unknown>;
  const preferences = (data.preferences ?? {}) as Record<string, unknown>;
  const onboarding = (data.onboarding ?? {}) as Record<string, unknown>;
  const routine = (onboarding.routine ?? {}) as Record<string, unknown>;
  const daysPerWeek = Number(routine.daysPerWeek);

  return {
    plannedTarget: Number.isInteger(daysPerWeek) && daysPerWeek > 0 ? daysPerWeek : 0,
    timeZone:
      typeof data.timezone === "string" && data.timezone.trim().length > 0
        ? data.timezone.trim()
        : defaultWeekTimeZone,
    weekStartsOn: preferences.weekStartsOn === "sunday" ? "sunday" : defaultWeekStartsOn,
  };
}

export async function loadWeeklyStats(uid: string, weekKey: string): Promise<WeeklyStats | null> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, ...weeksCollectionPath(uid), weekKey));

  if (!snapshot.exists()) {
    return null;
  }

  const parsed = weeklyStatsSchema.safeParse(snapshot.data());
  return parsed.success ? parsed.data : null;
}

/** Reads the most recent weeks of the signed-in person, newest first. */
export async function listWeeklyStatsHistory(uid: string, weeks: number): Promise<WeeklyStats[]> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDocs(
    query(
      collection(firestore, ...weeksCollectionPath(uid)),
      orderBy("weekKey", "desc"),
      limit(Math.max(1, weeks)),
    ),
  );

  return snapshot.docs
    .map((document) => weeklyStatsSchema.safeParse(document.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}
