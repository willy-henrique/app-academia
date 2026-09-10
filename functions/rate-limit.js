import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

const defaultMaxAttempts = 20;
const defaultWindowSeconds = 600;
const resolvePublicUserIdRateLimitPath = "rateLimits/resolvePublicUserId/consumers";
const sendTrainingInviteRateLimitPath = "rateLimits/sendTrainingInvite/consumers";
const sendTrainingInviteDefaultMaxAttempts = 30;
const sendTrainingInviteDefaultWindowSeconds = 3600;
const rebuildWeeklyStatsRateLimitPath = "rateLimits/rebuildWeeklyStats/consumers";
const rebuildWeeklyStatsDefaultMaxAttempts = 10;
const rebuildWeeklyStatsDefaultWindowSeconds = 3600;

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function getResolvePublicUserIdRateLimitConfig() {
  return {
    maxAttempts: parsePositiveInteger(
      process.env.RESOLVE_PUBLIC_USER_ID_RATE_LIMIT,
      defaultMaxAttempts,
    ),
    windowSeconds: parsePositiveInteger(
      process.env.RESOLVE_PUBLIC_USER_ID_RATE_LIMIT_WINDOW_SECONDS,
      defaultWindowSeconds,
    ),
  };
}

export function getSendTrainingInviteRateLimitConfig() {
  return {
    maxAttempts: parsePositiveInteger(
      process.env.SEND_TRAINING_INVITE_RATE_LIMIT,
      sendTrainingInviteDefaultMaxAttempts,
    ),
    windowSeconds: parsePositiveInteger(
      process.env.SEND_TRAINING_INVITE_RATE_LIMIT_WINDOW_SECONDS,
      sendTrainingInviteDefaultWindowSeconds,
    ),
  };
}

/**
 * O rebuild lê todas as sessões e participações da semana; é a chamada mais
 * cara do produto, então tem limite próprio e mais estreito.
 */
export function getRebuildWeeklyStatsRateLimitConfig() {
  return {
    maxAttempts: parsePositiveInteger(
      process.env.REBUILD_WEEKLY_STATS_RATE_LIMIT,
      rebuildWeeklyStatsDefaultMaxAttempts,
    ),
    windowSeconds: parsePositiveInteger(
      process.env.REBUILD_WEEKLY_STATS_RATE_LIMIT_WINDOW_SECONDS,
      rebuildWeeklyStatsDefaultWindowSeconds,
    ),
  };
}

function toSafeRateLimitKey(rawKey) {
  return Buffer.from(rawKey, "utf8").toString("base64url");
}

function toTimestampMillis(value) {
  if (!value || typeof value.toMillis !== "function") {
    return null;
  }

  return value.toMillis();
}

/**
 * Fixed-window rate limiter backed by a Firestore document. Shared by every
 * abuse-sensitive callable so limits stay consistent and server-only.
 */
export async function consumeRateLimit(firestore, options) {
  const { bucketPath, consumerKey, maxAttempts, windowSeconds } = options;
  const nowMs = options.nowMs ?? Date.now();
  const bucketRef = firestore.doc(`${bucketPath}/${toSafeRateLimitKey(consumerKey)}`);
  const windowMs = windowSeconds * 1000;
  const attemptDate = new Date(nowMs);
  let snapshotData;

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bucketRef);
    const data = snapshot.data();
    const windowStartsAtMs = toTimestampMillis(data?.windowStartsAt);
    const isWindowExpired = windowStartsAtMs === null || nowMs - windowStartsAtMs >= windowMs;
    const currentCount = snapshot.exists && !isWindowExpired ? Number(data?.count ?? 0) : 0;
    const nextCount = currentCount + 1;

    if (nextCount > maxAttempts) {
      throw new HttpsError(
        "resource-exhausted",
        "Muitas tentativas. Tente novamente em alguns minutos.",
      );
    }

    const windowStartsAt = isWindowExpired ? attemptDate : new Date(windowStartsAtMs);
    const windowEndsAt = new Date(windowStartsAt.getTime() + windowMs);

    snapshotData = {
      count: nextCount,
      remaining: Math.max(0, maxAttempts - nextCount),
      windowEndsAt,
      windowSeconds,
      windowStartsAt,
    };

    transaction.set(
      bucketRef,
      {
        count: nextCount,
        createdAt: snapshot.exists
          ? (data?.createdAt ?? FieldValue.serverTimestamp())
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        windowEndsAt,
        windowSeconds,
        windowStartsAt,
      },
      { merge: true },
    );
  });

  return snapshotData;
}

export async function consumeResolvePublicUserIdRateLimit(firestore, consumerKey, options = {}) {
  const config = options.config ?? getResolvePublicUserIdRateLimitConfig();

  return consumeRateLimit(firestore, {
    bucketPath: resolvePublicUserIdRateLimitPath,
    consumerKey,
    maxAttempts: config.maxAttempts,
    nowMs: options.nowMs,
    windowSeconds: config.windowSeconds,
  });
}

export async function consumeSendTrainingInviteRateLimit(firestore, consumerKey, options = {}) {
  const config = options.config ?? getSendTrainingInviteRateLimitConfig();

  return consumeRateLimit(firestore, {
    bucketPath: sendTrainingInviteRateLimitPath,
    consumerKey,
    maxAttempts: config.maxAttempts,
    nowMs: options.nowMs,
    windowSeconds: config.windowSeconds,
  });
}

export async function consumeRebuildWeeklyStatsRateLimit(firestore, consumerKey, options = {}) {
  const config = options.config ?? getRebuildWeeklyStatsRateLimitConfig();

  return consumeRateLimit(firestore, {
    bucketPath: rebuildWeeklyStatsRateLimitPath,
    consumerKey,
    maxAttempts: config.maxAttempts,
    nowMs: options.nowMs,
    windowSeconds: config.windowSeconds,
  });
}
