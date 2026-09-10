import { randomInt } from "node:crypto";

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as auth from "firebase-functions/v1/auth";

import {
  decideGroupParticipationCompletion,
  resolveGroupSessionClosure,
} from "./group-completion.js";
import { resolveWeekWindow, resolveWeekWindowFromKey } from "./week-key.js";
import {
  applyWorkoutCompletion,
  createEmptyWeeklyStats,
  projectWeeklyStats,
  summarizeSetDocuments,
} from "./weekly-stats.js";
import {
  consumeRebuildWeeklyStatsRateLimit,
  consumeResolvePublicUserIdRateLimit,
  consumeSendTrainingInviteRateLimit,
  getResolvePublicUserIdRateLimitConfig,
} from "./rate-limit.js";

setGlobalOptions({ region: "southamerica-east1" });

if (getApps().length === 0) {
  initializeApp();
}

const publicUserIdPrefix = "WT";
const publicUserIdAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const publicUserIdLength = 8;
const groupStartCountdownSeconds = 5;

function normalizePublicUserId(publicUserId) {
  return publicUserId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatPublicUserId(normalizedPublicUserId) {
  const body = normalizedPublicUserId.slice(publicUserIdPrefix.length);
  return `${publicUserIdPrefix}-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

function isValidPublicUserId(publicUserId) {
  return /^WT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(publicUserId);
}

function generatePublicUserId() {
  const body = Array.from({ length: publicUserIdLength }, () => {
    const index = randomInt(publicUserIdAlphabet.length);
    return publicUserIdAlphabet[index];
  }).join("");

  return formatPublicUserId(`${publicUserIdPrefix}${body}`);
}

function normalizeIndexKey(publicUserId) {
  return normalizePublicUserId(publicUserId);
}

function buildPublicDisplayName(authUser) {
  return authUser.displayName?.trim() || "Atleta WillTreino";
}

function buildPublicProfile(authUser, publicUserId) {
  return {
    avatar: authUser.photoURL ?? null,
    badgesPublic: [],
    createdAt: FieldValue.serverTimestamp(),
    displayName: buildPublicDisplayName(authUser),
    publicUserId,
    updatedAt: FieldValue.serverTimestamp(),
    username: null,
  };
}

function buildPrivateProfile(authUser) {
  return {
    birthDate: null,
    createdAt: FieldValue.serverTimestamp(),
    locale: authUser.locale ?? "pt-BR",
    onboardingVersion: 0,
    preferences: {
      simplifiedMode: false,
      weekStartsOn: "monday",
    },
    timezone: "America/Sao_Paulo",
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function ensureAppCheckIfEnforced(request) {
  if (process.env.FUNCTIONS_ENFORCE_APP_CHECK !== "true") {
    return;
  }

  if (!request.app) {
    throw new HttpsError("failed-precondition", "App Check é obrigatório para esta operação.");
  }
}

async function createIdentityForUser(authUser) {
  const firestore = getFirestore();
  const publicProfileRef = firestore.doc(`publicProfiles/${authUser.uid}`);
  const privateProfileRef = firestore.doc(`privateProfiles/${authUser.uid}`);

  const existingPublicProfile = await publicProfileRef.get();
  if (existingPublicProfile.exists) {
    return existingPublicProfile.data();
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const publicUserId = generatePublicUserId();
    const normalizedPublicUserId = normalizeIndexKey(publicUserId);
    const publicUserIdIndexRef = firestore.doc(`publicUserIdIndex/${normalizedPublicUserId}`);

    try {
      await firestore.runTransaction(async (transaction) => {
        const indexSnapshot = await transaction.get(publicUserIdIndexRef);

        if (indexSnapshot.exists) {
          throw new Error("public-user-id-collision");
        }

        transaction.set(publicUserIdIndexRef, {
          createdAt: FieldValue.serverTimestamp(),
          publicUserId,
          uid: authUser.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(publicProfileRef, buildPublicProfile(authUser, publicUserId));
        transaction.set(privateProfileRef, buildPrivateProfile(authUser));
      });

      return { publicUserId };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "public-user-id-collision") {
        throw error;
      }
    }
  }

  throw new HttpsError("aborted", "Não foi possível gerar um WillTreino ID único.");
}

export const onAuthUserCreated = auth.user().onCreate(async (user) => {
  await createIdentityForUser(user);
});

/**
 * Week configuration always comes from the person's own private profile:
 * timezone, week start preference and the weekly training target answered in
 * the onboarding. Never from the server clock.
 */
function readWeekConfiguration(profileData) {
  const daysPerWeek = Number(profileData?.onboarding?.routine?.daysPerWeek);

  return {
    plannedTarget: Number.isInteger(daysPerWeek) && daysPerWeek > 0 ? daysPerWeek : 0,
    timeZone:
      typeof profileData?.timezone === "string" && profileData.timezone.trim().length > 0
        ? profileData.timezone.trim()
        : undefined,
    weekStartsOn: profileData?.preferences?.weekStartsOn === "sunday" ? "sunday" : "monday",
  };
}

function weeklyStatsRef(firestore, uid, weekKey) {
  return firestore.doc(`weeklyStats/${uid}/weeks/${weekKey}`);
}

function processedEventRef(firestore, eventId) {
  return firestore.doc(`processedEvents/${eventId}`);
}

/**
 * Credits one completion to the weekly projection exactly once. The
 * `processedEvents` ledger is server-only and makes retries, double clicks and
 * reprocessing safe.
 */
async function creditWorkoutCompletion(transaction, firestore, event, configuration) {
  const window = resolveWeekWindow(new Date(event.completedAt), configuration);
  const ledgerRef = processedEventRef(firestore, event.eventId);
  const statsRef = weeklyStatsRef(firestore, event.uid, window.key);
  const [ledgerSnapshot, statsSnapshot] = await Promise.all([
    transaction.get(ledgerRef),
    transaction.get(statsRef),
  ]);

  if (ledgerSnapshot.exists) {
    return { credited: false, weekKey: ledgerSnapshot.data().weekKey ?? window.key };
  }

  const identity = {
    plannedTarget: configuration.plannedTarget ?? 0,
    timeZone: window.timeZone,
    uid: event.uid,
    weekKey: window.key,
    weekStartsOn: window.weekStartsOn,
  };
  const current = statsSnapshot.exists
    ? { ...createEmptyWeeklyStats(identity), ...statsSnapshot.data(), ...identity }
    : createEmptyWeeklyStats(identity);
  const next = applyWorkoutCompletion(current, event);

  transaction.set(statsRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
  transaction.set(ledgerRef, {
    completedAt: event.completedAt,
    createdAt: FieldValue.serverTimestamp(),
    eventId: event.eventId,
    mode: event.mode,
    source: event.source,
    uid: event.uid,
    weekKey: window.key,
  });

  return { credited: true, weekKey: window.key };
}

export const resolvePublicUserId = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Entre para resolver um WillTreino ID.");
  }

  const publicUserId = request.data?.publicUserId;
  if (typeof publicUserId !== "string") {
    throw new HttpsError("invalid-argument", "Informe um WillTreino ID válido.");
  }

  const normalizedPublicUserId = normalizeIndexKey(publicUserId);
  if (!isValidPublicUserId(formatPublicUserId(normalizedPublicUserId))) {
    throw new HttpsError("invalid-argument", "Informe um WillTreino ID válido.");
  }

  const firestore = getFirestore();
  await consumeResolvePublicUserIdRateLimit(firestore, request.auth.uid, {
    config: getResolvePublicUserIdRateLimitConfig(),
  });
  const indexSnapshot = await firestore.doc(`publicUserIdIndex/${normalizedPublicUserId}`).get();

  if (!indexSnapshot.exists) {
    throw new HttpsError("not-found", "WillTreino ID não encontrado.");
  }

  const indexData = indexSnapshot.data();
  const profileSnapshot = await firestore.doc(`publicProfiles/${indexData.uid}`).get();

  if (!profileSnapshot.exists) {
    throw new HttpsError("not-found", "WillTreino ID não encontrado.");
  }

  const profile = profileSnapshot.data();
  return {
    accountState: "ACTIVE",
    avatar: profile.avatar ?? null,
    displayName: profile.displayName,
    publicUserId: profile.publicUserId,
  };
});

const trainingInviteDefaultTtlSeconds = 48 * 60 * 60;
const trainingInviteResponseActions = ["ACCEPT", "DECLINE", "CANCEL"];

function getTrainingInviteTtlSeconds() {
  const parsed = Number(process.env.TRAINING_INVITE_TTL_SECONDS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : trainingInviteDefaultTtlSeconds;
}

function requireAuthedUid(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Entre para gerenciar convites de treino.");
  }

  return request.auth.uid;
}

function requireReference(value, message) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 128) {
    throw new HttpsError("invalid-argument", message);
  }

  return value.trim();
}

function toPublicPreview(profileData) {
  return {
    avatar: profileData.avatar ?? null,
    displayName: profileData.displayName,
    publicUserId: profileData.publicUserId,
  };
}

async function resolveReceiverUid(firestore, data) {
  if (typeof data?.receiverPublicUserId === "string" && data.receiverPublicUserId.trim() !== "") {
    const normalized = normalizeIndexKey(data.receiverPublicUserId);
    if (!isValidPublicUserId(formatPublicUserId(normalized))) {
      throw new HttpsError("invalid-argument", "Informe um WillTreino ID válido.");
    }

    const indexSnapshot = await firestore.doc(`publicUserIdIndex/${normalized}`).get();
    if (!indexSnapshot.exists) {
      throw new HttpsError("not-found", "WillTreino ID não encontrado.");
    }

    return indexSnapshot.data().uid;
  }

  if (typeof data?.receiverUid === "string" && data.receiverUid.trim() !== "") {
    return data.receiverUid.trim();
  }

  throw new HttpsError("invalid-argument", "Informe o WillTreino ID do parceiro.");
}

async function isBlocked(firestore, ownerUid, blockedUid) {
  const snapshot = await firestore.doc(`blockedUsers/${ownerUid}/blocked/${blockedUid}`).get();
  return snapshot.exists;
}

async function createInviteNotification(firestore, uid, payload) {
  const notificationRef = firestore.collection(`notifications/${uid}/items`).doc();
  await notificationRef.set({
    createdAt: FieldValue.serverTimestamp(),
    readAt: null,
    updatedAt: FieldValue.serverTimestamp(),
    ...payload,
  });
}

export const sendTrainingInvite = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const senderUid = requireAuthedUid(request);
  const data = request.data ?? {};

  const workoutPlanId = requireReference(
    data.workoutPlanId,
    "Informe o plano de treino do convite.",
  );
  const workoutPlanVersionId = requireReference(
    data.workoutPlanVersionId,
    "Informe a versão do plano de treino do convite.",
  );

  const firestore = getFirestore();
  const receiverUid = await resolveReceiverUid(firestore, data);

  if (receiverUid === senderUid) {
    throw new HttpsError("failed-precondition", "Não é possível convidar você mesmo.");
  }

  const [senderProfileSnapshot, receiverProfileSnapshot] = await Promise.all([
    firestore.doc(`publicProfiles/${senderUid}`).get(),
    firestore.doc(`publicProfiles/${receiverUid}`).get(),
  ]);

  if (!senderProfileSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Complete seu perfil antes de convidar parceiros.");
  }
  if (!receiverProfileSnapshot.exists) {
    throw new HttpsError("not-found", "WillTreino ID não encontrado.");
  }

  const [receiverBlocksSender, senderBlocksReceiver] = await Promise.all([
    isBlocked(firestore, receiverUid, senderUid),
    isBlocked(firestore, senderUid, receiverUid),
  ]);

  if (receiverBlocksSender) {
    throw new HttpsError("permission-denied", "Não é possível enviar convite para este usuário.");
  }
  if (senderBlocksReceiver) {
    throw new HttpsError(
      "failed-precondition",
      "Remova o bloqueio deste usuário para poder convidá-lo.",
    );
  }

  await consumeSendTrainingInviteRateLimit(firestore, senderUid);

  const senderPreview = toPublicPreview(senderProfileSnapshot.data());
  const receiverPreview = toPublicPreview(receiverProfileSnapshot.data());
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + getTrainingInviteTtlSeconds() * 1000).toISOString();

  const inviteRef = firestore.collection("trainingInvites").doc();

  await firestore.runTransaction(async (transaction) => {
    const pendingSnapshot = await transaction.get(
      firestore
        .collection("trainingInvites")
        .where("senderUid", "==", senderUid)
        .where("receiverUid", "==", receiverUid)
        .where("status", "==", "PENDING"),
    );

    const hasActivePending = pendingSnapshot.docs.some((doc) => {
      const expiresAtValue = doc.data().expiresAt;
      return typeof expiresAtValue === "string" && new Date(expiresAtValue).getTime() > nowMs;
    });

    if (hasActivePending) {
      throw new HttpsError(
        "failed-precondition",
        "Já existe um convite pendente para este parceiro.",
      );
    }

    transaction.set(inviteRef, {
      cancelledAt: null,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      groupSessionId: null,
      id: inviteRef.id,
      receiverAvatar: receiverPreview.avatar,
      receiverDisplayName: receiverPreview.displayName,
      receiverPublicUserId: receiverPreview.publicUserId,
      receiverUid,
      respondedAt: null,
      senderAvatar: senderPreview.avatar,
      senderDisplayName: senderPreview.displayName,
      senderPublicUserId: senderPreview.publicUserId,
      senderUid,
      status: "PENDING",
      updatedAt: FieldValue.serverTimestamp(),
      workoutPlanId,
      workoutPlanVersionId,
    });
  });

  await createInviteNotification(firestore, receiverUid, {
    inviteId: inviteRef.id,
    senderDisplayName: senderPreview.displayName,
    senderPublicUserId: senderPreview.publicUserId,
    type: "TRAINING_INVITE_RECEIVED",
  });

  return { expiresAt, inviteId: inviteRef.id, status: "PENDING" };
});

function buildGroupSessionWrites(transaction, firestore, invite) {
  const groupSessionRef = firestore.collection("groupSessions").doc();
  const timestamp = FieldValue.serverTimestamp();

  transaction.set(groupSessionRef, {
    createdAt: timestamp,
    hostUid: invite.senderUid,
    sharedEquipmentMode: "UNSET",
    startAt: null,
    stationMode: "ROTATION_SHARED_STATION",
    status: "LOBBY",
    updatedAt: timestamp,
    weightChangeMode: "UNSET",
    weightChangeSeconds: null,
    workoutPlanId: invite.workoutPlanId,
    workoutPlanVersionId: invite.workoutPlanVersionId,
  });

  transaction.set(groupSessionRef.collection("participants").doc(invite.senderUid), {
    completedAt: null,
    displaySnapshot: {
      avatar: invite.senderAvatar,
      displayName: invite.senderDisplayName,
      publicUserId: invite.senderPublicUserId,
    },
    joinedAt: timestamp,
    leftAt: null,
    operationalState: "WAITING_TURN",
    operationalStateUpdatedAt: null,
    readyAt: null,
    role: "HOST",
    status: "INVITED",
    uid: invite.senderUid,
  });

  transaction.set(groupSessionRef.collection("participants").doc(invite.receiverUid), {
    completedAt: null,
    displaySnapshot: {
      avatar: invite.receiverAvatar,
      displayName: invite.receiverDisplayName,
      publicUserId: invite.receiverPublicUserId,
    },
    joinedAt: timestamp,
    leftAt: null,
    operationalState: "WAITING_TURN",
    operationalStateUpdatedAt: null,
    readyAt: null,
    role: "MEMBER",
    status: "READY",
    uid: invite.receiverUid,
  });

  return groupSessionRef.id;
}

export const respondToTrainingInvite = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const data = request.data ?? {};

  const inviteId = requireReference(data.inviteId, "Informe o convite a ser respondido.");
  const action = data.action;
  if (!trainingInviteResponseActions.includes(action)) {
    throw new HttpsError("invalid-argument", "Ação de convite inválida.");
  }

  const firestore = getFirestore();
  const inviteRef = firestore.doc(`trainingInvites/${inviteId}`);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const result = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(inviteRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Convite não encontrado.");
    }

    const invite = snapshot.data();
    const expiresAtMs =
      typeof invite.expiresAt === "string" ? new Date(invite.expiresAt).getTime() : Number.NaN;
    const isExpired =
      invite.status === "PENDING" && Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs;

    if (isExpired) {
      transaction.update(inviteRef, { status: "EXPIRED", updatedAt: FieldValue.serverTimestamp() });
    }

    const effectiveStatus = isExpired ? "EXPIRED" : invite.status;

    if (action === "ACCEPT") {
      if (actorUid !== invite.receiverUid) {
        throw new HttpsError("permission-denied", "Apenas quem recebeu o convite pode aceitá-lo.");
      }
      if (invite.status === "ACCEPTED") {
        return { groupSessionId: invite.groupSessionId ?? null, status: "ACCEPTED" };
      }
      if (effectiveStatus !== "PENDING") {
        throw new HttpsError("failed-precondition", "Este convite não pode mais ser aceito.");
      }

      const groupSessionId = buildGroupSessionWrites(transaction, firestore, invite);
      transaction.update(inviteRef, {
        groupSessionId,
        respondedAt: nowIso,
        status: "ACCEPTED",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { groupSessionId, status: "ACCEPTED" };
    }

    if (action === "DECLINE") {
      if (actorUid !== invite.receiverUid) {
        throw new HttpsError("permission-denied", "Apenas quem recebeu o convite pode recusá-lo.");
      }
      if (invite.status === "DECLINED") {
        return { groupSessionId: null, status: "DECLINED" };
      }
      if (invite.status !== "PENDING") {
        throw new HttpsError("failed-precondition", "Este convite não pode mais ser recusado.");
      }

      transaction.update(inviteRef, {
        respondedAt: nowIso,
        status: "DECLINED",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { groupSessionId: null, status: "DECLINED" };
    }

    if (actorUid !== invite.senderUid) {
      throw new HttpsError("permission-denied", "Apenas quem enviou o convite pode cancelá-lo.");
    }
    if (invite.status === "CANCELLED") {
      return { groupSessionId: null, status: "CANCELLED" };
    }
    if (invite.status !== "PENDING") {
      throw new HttpsError("failed-precondition", "Este convite não pode mais ser cancelado.");
    }

    transaction.update(inviteRef, {
      cancelledAt: nowIso,
      status: "CANCELLED",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { groupSessionId: null, status: "CANCELLED" };
  });

  if (result.status === "ACCEPTED" && result.groupSessionId) {
    const inviteSnapshot = await inviteRef.get();
    const invite = inviteSnapshot.data();
    await createInviteNotification(firestore, invite.senderUid, {
      groupSessionId: result.groupSessionId,
      inviteId,
      receiverDisplayName: invite.receiverDisplayName,
      receiverPublicUserId: invite.receiverPublicUserId,
      type: "TRAINING_INVITE_ACCEPTED",
    });
  }

  return { inviteId, ...result };
});

export const startGroupSession = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const sessionId = requireReference(
    request.data?.sessionId,
    "Informe a sessão de grupo para iniciar.",
  );
  const firestore = getFirestore();
  const sessionRef = firestore.doc(`groupSessions/${sessionId}`);

  return firestore.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Sessão de grupo não encontrada.");
    }

    const session = sessionSnapshot.data();
    if (session.hostUid !== actorUid) {
      throw new HttpsError("permission-denied", "Apenas o host pode iniciar este treino.");
    }
    if (session.status === "COUNTDOWN" || session.status === "ACTIVE") {
      if (typeof session.startAt !== "string") {
        throw new HttpsError("failed-precondition", "A sessão iniciada não possui startAt válido.");
      }
      return {
        countdownSeconds: groupStartCountdownSeconds,
        sessionId,
        startAt: session.startAt,
        status: session.status,
      };
    }
    if (session.status !== "LOBBY") {
      throw new HttpsError("failed-precondition", "A sessão não pode ser iniciada neste estado.");
    }

    const participantsSnapshot = await transaction.get(sessionRef.collection("participants"));
    const participants = participantsSnapshot.docs.map((participant) => participant.data());
    if (
      participants.length < 2 ||
      participants.some((participant) => participant.status !== "READY")
    ) {
      throw new HttpsError("failed-precondition", "Todos os participantes precisam estar prontos.");
    }

    const startAt = Timestamp.fromMillis(
      Timestamp.now().toMillis() + groupStartCountdownSeconds * 1000,
    )
      .toDate()
      .toISOString();
    transaction.update(sessionRef, {
      startAt,
      status: "COUNTDOWN",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      countdownSeconds: groupStartCountdownSeconds,
      sessionId,
      startAt,
      status: "COUNTDOWN",
    };
  });
});

export const activateGroupSession = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const sessionId = requireReference(
    request.data?.sessionId,
    "Informe a sessão de grupo para ativar.",
  );
  const firestore = getFirestore();
  const sessionRef = firestore.doc(`groupSessions/${sessionId}`);
  const actorParticipantRef = sessionRef.collection("participants").doc(actorUid);

  return firestore.runTransaction(async (transaction) => {
    const [sessionSnapshot, actorParticipantSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(actorParticipantRef),
    ]);
    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Sessão de grupo não encontrada.");
    }
    if (!actorParticipantSnapshot.exists) {
      throw new HttpsError("permission-denied", "Você não participa deste treino.");
    }

    const session = sessionSnapshot.data();
    if (typeof session.startAt !== "string" || Number.isNaN(Date.parse(session.startAt))) {
      throw new HttpsError(
        "failed-precondition",
        "A sessão não possui início sincronizado válido.",
      );
    }
    if (session.status === "ACTIVE") {
      return { sessionId, startAt: session.startAt, status: "ACTIVE" };
    }
    if (session.status !== "COUNTDOWN") {
      throw new HttpsError("failed-precondition", "A sessão não está aguardando início.");
    }
    if (Date.now() < Date.parse(session.startAt)) {
      throw new HttpsError("failed-precondition", "A contagem sincronizada ainda não terminou.");
    }

    const participantsSnapshot = await transaction.get(sessionRef.collection("participants"));
    transaction.update(sessionRef, {
      status: "ACTIVE",
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const participant of participantsSnapshot.docs) {
      transaction.update(participant.ref, {
        operationalState: "WAITING_TURN",
        operationalStateUpdatedAt: FieldValue.serverTimestamp(),
        status: "ACTIVE",
      });
    }

    return { sessionId, startAt: session.startAt, status: "ACTIVE" };
  });
});

export const leaveGroupSession = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const sessionId = requireReference(request.data?.sessionId, "Informe a sessão de grupo.");
  const firestore = getFirestore();
  const sessionRef = firestore.doc(`groupSessions/${sessionId}`);
  const participantRef = sessionRef.collection("participants").doc(actorUid);

  return firestore.runTransaction(async (transaction) => {
    const [sessionSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(participantRef),
    ]);
    if (!sessionSnapshot.exists || !participantSnapshot.exists) {
      throw new HttpsError("not-found", "Participação na sessão não encontrada.");
    }

    const participant = participantSnapshot.data();
    if (participant.status === "LEFT") {
      return { participantStatus: "LEFT", sessionId };
    }
    if (["COMPLETED", "CANCELLED"].includes(sessionSnapshot.data().status)) {
      throw new HttpsError("failed-precondition", "Esta sessão não permite mais saída.");
    }

    const participantsSnapshot = await transaction.get(sessionRef.collection("participants"));
    const statusesAfterLeave = participantsSnapshot.docs.map((doc) =>
      doc.id === actorUid ? "LEFT" : doc.data().status,
    );
    const sessionStatus = resolveGroupSessionClosure(
      statusesAfterLeave,
      sessionSnapshot.data().status,
    );

    transaction.update(participantRef, {
      leftAt: FieldValue.serverTimestamp(),
      operationalState: "PAUSED",
      operationalStateUpdatedAt: FieldValue.serverTimestamp(),
      status: "LEFT",
    });
    if (sessionStatus !== sessionSnapshot.data().status) {
      transaction.update(sessionRef, {
        status: sessionStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { participantStatus: "LEFT", sessionId, sessionStatus };
  });
});

/**
 * Closes one person's participation in a shared session. Completion is
 * individual and idempotent: the caller's sets stay untouched, nobody else is
 * completed and the shared session only closes when no one is still training.
 */
export const completeGroupParticipation = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const sessionId = requireReference(request.data?.sessionId, "Informe a sessão de grupo.");
  const firestore = getFirestore();
  const sessionRef = firestore.doc(`groupSessions/${sessionId}`);
  const participantRef = sessionRef.collection("participants").doc(actorUid);

  return firestore.runTransaction(async (transaction) => {
    const [sessionSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(participantRef),
    ]);
    if (!sessionSnapshot.exists || !participantSnapshot.exists) {
      throw new HttpsError("not-found", "Participação na sessão não encontrada.");
    }

    const session = sessionSnapshot.data();
    const participant = participantSnapshot.data();
    const decision = decideGroupParticipationCompletion(participant.status, session.status);
    if (!decision.allowed) {
      throw new HttpsError("failed-precondition", decision.reason);
    }
    if (decision.alreadyCompleted) {
      const ledgerSnapshot = await transaction.get(
        processedEventRef(firestore, `group:${sessionId}:${actorUid}`),
      );
      return {
        participantStatus: "COMPLETED",
        sessionId,
        sessionStatus: session.status,
        weekKey: ledgerSnapshot.exists ? (ledgerSnapshot.data().weekKey ?? null) : null,
      };
    }

    const participantsSnapshot = await transaction.get(sessionRef.collection("participants"));
    const statusesAfterCompletion = participantsSnapshot.docs.map((doc) =>
      doc.id === actorUid ? "COMPLETED" : doc.data().status,
    );
    const sessionStatus = resolveGroupSessionClosure(statusesAfterCompletion, session.status);

    const [profileSnapshot, setsSnapshot] = await Promise.all([
      transaction.get(firestore.doc(`privateProfiles/${actorUid}`)),
      transaction.get(participantRef.collection("sets")),
    ]);
    const configuration = readWeekConfiguration(profileSnapshot.data());
    const totals = summarizeSetDocuments(setsSnapshot.docs);
    const completedAt = new Date().toISOString();
    const credit = await creditWorkoutCompletion(
      transaction,
      firestore,
      {
        cardioCompleted: false,
        completedAt,
        eventId: `group:${sessionId}:${actorUid}`,
        kind: "STRENGTH",
        mode: "GROUP",
        planId: session.workoutPlanId ?? null,
        planVersionId: session.workoutPlanVersionId ?? null,
        source:
          profileSnapshot.data()?.activeWorkoutPlanId === session.workoutPlanId
            ? "PLANNED"
            : "EXTRA",
        totalReps: totals.totalReps,
        totalSets: totals.totalSets,
        totalVolumeKg: totals.totalVolumeKg,
        uid: actorUid,
      },
      configuration,
    );

    transaction.update(participantRef, {
      completedAt: FieldValue.serverTimestamp(),
      operationalState: "PAUSED",
      operationalStateUpdatedAt: FieldValue.serverTimestamp(),
      status: "COMPLETED",
    });
    if (sessionStatus !== session.status) {
      transaction.update(sessionRef, {
        status: sessionStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      participantStatus: "COMPLETED",
      sessionId,
      sessionStatus,
      weekKey: credit.weekKey,
    };
  });
});

/**
 * Credits a finished solo session to the weekly projection. The client never
 * writes `weeklyStats`: it asks the server, which validates ownership, reads
 * the session as the source of truth and credits the event once.
 */
export const recordWorkoutCompletion = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const sessionId = requireReference(request.data?.sessionId, "Informe a sessão de treino.");
  const firestore = getFirestore();
  const sessionRef = firestore.doc(`workoutSessions/${sessionId}`);
  const profileRef = firestore.doc(`privateProfiles/${actorUid}`);

  return firestore.runTransaction(async (transaction) => {
    const [sessionSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(profileRef),
    ]);
    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Sessão de treino não encontrada.");
    }

    const session = sessionSnapshot.data();
    if (session.ownerUid !== actorUid) {
      throw new HttpsError("permission-denied", "Só o dono da sessão registra a conclusão dela.");
    }
    if (session.status !== "COMPLETED") {
      throw new HttpsError("failed-precondition", "A sessão ainda não foi concluída.");
    }

    const completedAt =
      typeof session.completedAt === "string" && !Number.isNaN(Date.parse(session.completedAt))
        ? session.completedAt
        : new Date().toISOString();
    const profile = profileSnapshot.data();
    const configuration = readWeekConfiguration(profile);
    const progress = session.progress ?? {};
    const credit = await creditWorkoutCompletion(
      transaction,
      firestore,
      {
        cardioCompleted: session.optionalCardioStatus === "COMPLETED",
        completedAt,
        eventId: `solo:${sessionId}:${actorUid}`,
        kind: "STRENGTH",
        mode: "SOLO",
        planId: session.planId ?? null,
        planVersionId: session.planVersionId ?? null,
        source: profile?.activeWorkoutPlanId === session.planId ? "PLANNED" : "EXTRA",
        totalReps: Number(progress.totalReps) || 0,
        totalSets: Number(progress.totalSets) || 0,
        totalVolumeKg: Number(progress.totalVolume) || 0,
        uid: actorUid,
      },
      configuration,
    );

    return { credited: credit.credited, sessionId, weekKey: credit.weekKey };
  });
});

/**
 * Recomputes one week from the source of truth (own sessions and own group
 * participations) and replaces the projection. Used when the ledger and the
 * aggregate ever disagree.
 */
export const rebuildWeeklyStats = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const weekKey = requireReference(request.data?.weekKey, "Informe a semana a reconstruir.");
  const firestore = getFirestore();
  await consumeRebuildWeeklyStatsRateLimit(firestore, actorUid);
  const profileSnapshot = await firestore.doc(`privateProfiles/${actorUid}`).get();
  const configuration = readWeekConfiguration(profileSnapshot.data());
  const window = resolveWeekWindowFromKey(weekKey, configuration);

  if (!window) {
    throw new HttpsError("invalid-argument", "Semana inválida para o fuso desta conta.");
  }

  const activePlanId = profileSnapshot.data()?.activeWorkoutPlanId ?? null;
  const [soloSessions, groupParticipations] = await Promise.all([
    firestore
      .collection("workoutSessions")
      .where("ownerUid", "==", actorUid)
      .where("status", "==", "COMPLETED")
      .where("completedAt", ">=", window.startsAt)
      .where("completedAt", "<", window.endsAt)
      .get(),
    firestore
      .collectionGroup("participants")
      .where("uid", "==", actorUid)
      .where("status", "==", "COMPLETED")
      .get(),
  ]);

  const cardioSessions = await firestore
    .collection("cardioSessions")
    .where("ownerUid", "==", actorUid)
    .where("status", "==", "COMPLETED")
    .where("completedAt", ">=", window.startsAt)
    .where("completedAt", "<", window.endsAt)
    .get();

  const events = soloSessions.docs.map((doc) => {
    const session = doc.data();
    const progress = session.progress ?? {};
    return {
      cardioCompleted: session.optionalCardioStatus === "COMPLETED",
      completedAt: session.completedAt,
      eventId: `solo:${doc.id}:${actorUid}`,
      kind: "STRENGTH",
      mode: "SOLO",
      source: activePlanId === session.planId ? "PLANNED" : "EXTRA",
      totalReps: Number(progress.totalReps) || 0,
      totalSets: Number(progress.totalSets) || 0,
      totalVolumeKg: Number(progress.totalVolume) || 0,
      uid: actorUid,
    };
  });

  for (const participation of groupParticipations.docs) {
    const completedAt = participation.data().completedAt;
    const completedAtIso =
      completedAt && typeof completedAt.toDate === "function"
        ? completedAt.toDate().toISOString()
        : typeof completedAt === "string"
          ? completedAt
          : null;
    if (!completedAtIso || completedAtIso < window.startsAt || completedAtIso >= window.endsAt) {
      continue;
    }

    const sessionRef = participation.ref.parent.parent;
    if (!sessionRef) {
      continue;
    }

    const [sessionSnapshot, setsSnapshot] = await Promise.all([
      sessionRef.get(),
      participation.ref.collection("sets").get(),
    ]);
    const totals = summarizeSetDocuments(setsSnapshot.docs);
    events.push({
      cardioCompleted: false,
      completedAt: completedAtIso,
      eventId: `group:${sessionRef.id}:${actorUid}`,
      kind: "STRENGTH",
      mode: "GROUP",
      source: activePlanId === sessionSnapshot.data()?.workoutPlanId ? "PLANNED" : "EXTRA",
      totalReps: totals.totalReps,
      totalSets: totals.totalSets,
      totalVolumeKg: totals.totalVolumeKg,
      uid: actorUid,
    });
  }

  for (const cardio of cardioSessions.docs) {
    events.push({
      cardioCompleted: true,
      cardioSeconds: Number(cardio.data().durationSeconds) || 0,
      completedAt: cardio.data().completedAt,
      eventId: `cardio:${cardio.id}:${actorUid}`,
      kind: "CARDIO",
      mode: "SOLO",
      source: "EXTRA",
      totalReps: 0,
      totalSets: 0,
      totalVolumeKg: 0,
      uid: actorUid,
    });
  }

  const stats = projectWeeklyStats(
    {
      plannedTarget: configuration.plannedTarget ?? 0,
      timeZone: window.timeZone,
      uid: actorUid,
      weekKey: window.key,
      weekStartsOn: window.weekStartsOn,
    },
    events,
  );

  const batch = firestore.batch();
  batch.set(weeklyStatsRef(firestore, actorUid, window.key), {
    ...stats,
    updatedAt: FieldValue.serverTimestamp(),
  });
  for (const event of events) {
    batch.set(
      processedEventRef(firestore, event.eventId),
      {
        completedAt: event.completedAt,
        createdAt: FieldValue.serverTimestamp(),
        eventId: event.eventId,
        mode: event.mode,
        source: event.source,
        uid: event.uid,
        weekKey: window.key,
      },
      { merge: true },
    );
  }
  await batch.commit();

  return { events: events.length, weekKey: window.key };
});

/**
 * Credits a finished cardio session. Cardio and strength are separate axes:
 * this never counts as a strength workout and skipping cardio never reduces
 * any strength metric.
 */
export const recordCardioCompletion = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const actorUid = requireAuthedUid(request);
  const cardioSessionId = requireReference(
    request.data?.cardioSessionId,
    "Informe a sessão de cardio.",
  );
  const firestore = getFirestore();
  const cardioRef = firestore.doc(`cardioSessions/${cardioSessionId}`);
  const profileRef = firestore.doc(`privateProfiles/${actorUid}`);

  return firestore.runTransaction(async (transaction) => {
    const [cardioSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(cardioRef),
      transaction.get(profileRef),
    ]);
    if (!cardioSnapshot.exists) {
      throw new HttpsError("not-found", "Sessão de cardio não encontrada.");
    }

    const cardio = cardioSnapshot.data();
    if (cardio.ownerUid !== actorUid) {
      throw new HttpsError("permission-denied", "Só o dono registra o próprio cardio.");
    }
    if (cardio.status !== "COMPLETED") {
      throw new HttpsError("failed-precondition", "O cardio ainda não foi concluído.");
    }

    const completedAt =
      typeof cardio.completedAt === "string" && !Number.isNaN(Date.parse(cardio.completedAt))
        ? cardio.completedAt
        : new Date().toISOString();
    const credit = await creditWorkoutCompletion(
      transaction,
      firestore,
      {
        cardioCompleted: true,
        cardioSeconds: Number(cardio.durationSeconds) || 0,
        completedAt,
        eventId: `cardio:${cardioSessionId}:${actorUid}`,
        kind: "CARDIO",
        mode: "SOLO",
        source: "EXTRA",
        totalReps: 0,
        totalSets: 0,
        totalVolumeKg: 0,
        uid: actorUid,
      },
      readWeekConfiguration(profileSnapshot.data()),
    );

    return { cardioSessionId, credited: credit.credited, weekKey: credit.weekKey };
  });
});

const ownedDocumentCollections = [
  "publicProfiles",
  "privateProfiles",
  "fitnessProfiles",
  "healthProfiles",
  "accessibilityProfiles",
  "nutritionProfiles",
  "userSettings",
];

const exportDocumentLimit = 500;

function serializeForExport(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeForExport);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeForExport(item)]),
    );
  }

  return value;
}

/**
 * Exporta os dados da própria conta (LGPD, direito de acesso e portabilidade).
 * Só o dono chama, o servidor lê apenas documentos dele e nada de terceiros
 * entra no pacote — de um treino em grupo sai apenas a própria participação.
 */
export const exportAccountData = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const uid = requireAuthedUid(request);
  const firestore = getFirestore();
  const data = {};

  for (const collection of ownedDocumentCollections) {
    const snapshot = await firestore.doc(`${collection}/${uid}`).get();
    data[collection] = snapshot.exists ? serializeForExport(snapshot.data()) : null;
  }

  const [workoutSessions, cardioSessions, measurements, weeklyStats, groupParticipations] =
    await Promise.all([
      firestore
        .collection("workoutSessions")
        .where("ownerUid", "==", uid)
        .limit(exportDocumentLimit)
        .get(),
      firestore
        .collection("cardioSessions")
        .where("ownerUid", "==", uid)
        .limit(exportDocumentLimit)
        .get(),
      firestore.collection(`measurements/${uid}/items`).limit(exportDocumentLimit).get(),
      firestore.collection(`weeklyStats/${uid}/weeks`).limit(exportDocumentLimit).get(),
      firestore
        .collectionGroup("participants")
        .where("uid", "==", uid)
        .limit(exportDocumentLimit)
        .get(),
    ]);

  data.workoutSessions = workoutSessions.docs.map((doc) => ({
    id: doc.id,
    ...serializeForExport(doc.data()),
  }));
  data.cardioSessions = cardioSessions.docs.map((doc) => ({
    id: doc.id,
    ...serializeForExport(doc.data()),
  }));
  data.measurements = measurements.docs.map((doc) => ({
    id: doc.id,
    ...serializeForExport(doc.data()),
  }));
  data.weeklyStats = weeklyStats.docs.map((doc) => ({
    id: doc.id,
    ...serializeForExport(doc.data()),
  }));
  data.groupParticipations = groupParticipations.docs.map((doc) => ({
    groupSessionId: doc.ref.parent.parent?.id ?? null,
    ...serializeForExport(doc.data()),
  }));

  return { exportedAt: new Date().toISOString(), data, uid };
});

async function deleteQueryInBatches(firestore, query) {
  const snapshot = await query.limit(300).get();
  if (snapshot.empty) {
    return 0;
  }

  const batch = firestore.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();

  return snapshot.size + (await deleteQueryInBatches(firestore, query));
}

/**
 * Apaga a própria conta (LGPD, direito de eliminação). Exige confirmação
 * explícita do texto `EXCLUIR`. O treino de outras pessoas é preservado: a
 * participação em grupo vira um registro anônimo em vez de sumir e levar junto
 * o histórico de quem treinou com a pessoa.
 */
export const deleteAccountData = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const uid = requireAuthedUid(request);

  if (request.data?.confirmation !== "EXCLUIR") {
    throw new HttpsError(
      "failed-precondition",
      "Confirme a exclusão enviando exatamente o texto EXCLUIR.",
    );
  }

  const firestore = getFirestore();
  let deletedDocuments = 0;

  const workoutSessions = await firestore
    .collection("workoutSessions")
    .where("ownerUid", "==", uid)
    .get();
  for (const session of workoutSessions.docs) {
    deletedDocuments += await deleteQueryInBatches(firestore, session.ref.collection("sets"));
    await session.ref.delete();
    deletedDocuments += 1;
  }

  deletedDocuments += await deleteQueryInBatches(
    firestore,
    firestore.collection("cardioSessions").where("ownerUid", "==", uid),
  );
  deletedDocuments += await deleteQueryInBatches(
    firestore,
    firestore.collection(`measurements/${uid}/items`),
  );
  deletedDocuments += await deleteQueryInBatches(
    firestore,
    firestore.collection(`weeklyStats/${uid}/weeks`),
  );
  deletedDocuments += await deleteQueryInBatches(
    firestore,
    firestore.collection(`notifications/${uid}/items`),
  );
  deletedDocuments += await deleteQueryInBatches(
    firestore,
    firestore.collection(`blockedUsers/${uid}/blocked`),
  );

  const participations = await firestore
    .collectionGroup("participants")
    .where("uid", "==", uid)
    .get();
  for (const participation of participations.docs) {
    deletedDocuments += await deleteQueryInBatches(firestore, participation.ref.collection("sets"));
    await participation.ref.update({
      displaySnapshot: {
        avatar: null,
        displayName: "Conta removida",
        publicUserId: "WT-XXXX-XXXX",
      },
      status: "LEFT",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const publicProfileSnapshot = await firestore.doc(`publicProfiles/${uid}`).get();
  const publicUserId = publicProfileSnapshot.data()?.publicUserId;
  const batch = firestore.batch();
  for (const collection of ownedDocumentCollections) {
    batch.delete(firestore.doc(`${collection}/${uid}`));
  }
  if (typeof publicUserId === "string") {
    batch.delete(firestore.doc(`publicUserIdIndex/${normalizeIndexKey(publicUserId)}`));
  }
  await batch.commit();
  deletedDocuments += ownedDocumentCollections.length;

  await getAuth().deleteUser(uid);

  return { deletedDocuments, deletedAt: new Date().toISOString(), uid };
});

export const pruneExpiredTrainingInvites = onCall(async (request) => {
  ensureAppCheckIfEnforced(request);
  const uid = requireAuthedUid(request);
  const firestore = getFirestore();
  const nowMs = Date.now();

  const [asSender, asReceiver] = await Promise.all([
    firestore
      .collection("trainingInvites")
      .where("senderUid", "==", uid)
      .where("status", "==", "PENDING")
      .get(),
    firestore
      .collection("trainingInvites")
      .where("receiverUid", "==", uid)
      .where("status", "==", "PENDING")
      .get(),
  ]);

  const staleDocs = new Map();
  for (const doc of [...asSender.docs, ...asReceiver.docs]) {
    const expiresAtValue = doc.data().expiresAt;
    if (typeof expiresAtValue === "string" && new Date(expiresAtValue).getTime() <= nowMs) {
      staleDocs.set(doc.id, doc.ref);
    }
  }

  if (staleDocs.size === 0) {
    return { expired: 0 };
  }

  const batch = firestore.batch();
  for (const ref of staleDocs.values()) {
    batch.update(ref, { status: "EXPIRED", updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();

  return { expired: staleDocs.size };
});
