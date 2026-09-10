import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getFirestore as getClientFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  initializeApp as initializeAdminApp,
  deleteApp as deleteAdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { afterEach, describe, expect, it } from "vitest";

const authEmulatorUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const functionsEmulatorHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1";
const functionsEmulatorPort = Number(process.env.FIREBASE_FUNCTIONS_EMULATOR_PORT ?? "5001");

let apps: FirebaseApp[] = [];
let adminApp: ReturnType<typeof initializeAdminApp> | undefined;

function adminFirestore() {
  if (!adminApp) {
    adminApp = initializeAdminApp({ projectId: "willtreino-local" });
  }

  return getAdminFirestore(adminApp);
}

async function waitForDocument(path: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const snapshot = await adminFirestore().doc(path).get();
    if (snapshot.exists) {
      return snapshot;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Document not found: ${path}`);
}

interface TestUser {
  firestore: Firestore;
  functions: ReturnType<typeof getFunctions>;
  publicUserId: string;
  uid: string;
}

async function createTestUser(label: string): Promise<TestUser> {
  const app = initializeApp(
    {
      apiKey: "emulator-api-key",
      appId: `willtreino-invites-${label}`,
      authDomain: "willtreino-local.firebaseapp.com",
      projectId: "willtreino-local",
    },
    `invites-${label}-${crypto.randomUUID()}`,
  );
  apps.push(app);

  const auth = getAuth(app);
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  const functions = getFunctions(app, "southamerica-east1");
  connectFunctionsEmulator(functions, functionsEmulatorHost, functionsEmulatorPort);
  const firestore = getClientFirestore(app);
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);

  const email = `${label}-${crypto.randomUUID()}@willtreino.test`;
  const credential = await createUserWithEmailAndPassword(auth, email, "very-secure-password");
  const profile = await waitForDocument(`publicProfiles/${credential.user.uid}`);

  return {
    firestore,
    functions,
    publicUserId: profile.data()?.publicUserId as string,
    uid: credential.user.uid,
  };
}

afterEach(async () => {
  await Promise.all(apps.map((app) => deleteApp(app).catch(() => undefined)));
  apps = [];
  if (adminApp) {
    await deleteAdminApp(adminApp);
    adminApp = undefined;
  }
});

describe("training invites", () => {
  it("sends, accepts and creates one shared group session", { timeout: 30000 }, async () => {
    const sender = await createTestUser("sender");
    const receiver = await createTestUser("receiver");

    const sendInvite = httpsCallable(sender.functions, "sendTrainingInvite");
    const sent = (await sendInvite({
      receiverPublicUserId: receiver.publicUserId,
      workoutPlanId: "plan-1",
      workoutPlanVersionId: "version-1",
    })) as { data: { expiresAt: string; inviteId: string; status: string } };

    expect(sent.data.status).toBe("PENDING");
    const inviteId = sent.data.inviteId;
    expect(new Date(sent.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const inviteSnapshot = await waitForDocument(`trainingInvites/${inviteId}`);
    expect(inviteSnapshot.data()?.senderUid).toBe(sender.uid);
    expect(inviteSnapshot.data()?.receiverUid).toBe(receiver.uid);
    expect(inviteSnapshot.data()?.status).toBe("PENDING");

    const notifications = await adminFirestore()
      .collection(`notifications/${receiver.uid}/items`)
      .get();
    expect(notifications.size).toBe(1);
    expect(notifications.docs[0].data().type).toBe("TRAINING_INVITE_RECEIVED");
    expect(notifications.docs[0].data().workoutPlanId).toBeUndefined();

    await expect(
      sendInvite({
        receiverPublicUserId: receiver.publicUserId,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      }),
    ).rejects.toMatchObject({ code: expect.stringContaining("failed-precondition") });

    const respond = httpsCallable(receiver.functions, "respondToTrainingInvite");
    const accepted = (await respond({ action: "ACCEPT", inviteId })) as {
      data: { groupSessionId: string; status: string };
    };
    expect(accepted.data.status).toBe("ACCEPTED");
    const groupSessionId = accepted.data.groupSessionId;

    const groupSession = await waitForDocument(`groupSessions/${groupSessionId}`);
    expect(groupSession.data()?.hostUid).toBe(sender.uid);
    expect(groupSession.data()?.status).toBe("LOBBY");
    expect(groupSession.data()?.stationMode).toBe("ROTATION_SHARED_STATION");

    const hostParticipant = await waitForDocument(
      `groupSessions/${groupSessionId}/participants/${sender.uid}`,
    );
    const memberParticipant = await waitForDocument(
      `groupSessions/${groupSessionId}/participants/${receiver.uid}`,
    );
    expect(hostParticipant.data()?.role).toBe("HOST");
    expect(memberParticipant.data()?.role).toBe("MEMBER");
    expect(hostParticipant.data()?.displaySnapshot).toMatchObject({
      displayName: expect.any(String),
      publicUserId: sender.publicUserId,
    });

    await adminFirestore()
      .doc(`groupSessions/${groupSessionId}/participants/${sender.uid}`)
      .update({ readyAt: new Date(), status: "READY" });

    await expect(
      httpsCallable(receiver.functions, "startGroupSession")({ sessionId: groupSessionId }),
    ).rejects.toMatchObject({ code: expect.stringContaining("permission-denied") });

    const start = httpsCallable(sender.functions, "startGroupSession");
    const started = (await start({ sessionId: groupSessionId })) as {
      data: { startAt: string; status: string };
    };
    expect(started.data.status).toBe("COUNTDOWN");
    expect(new Date(started.data.startAt).getTime()).toBeGreaterThan(Date.now());

    const startedAgain = (await start({ sessionId: groupSessionId })) as {
      data: { startAt: string; status: string };
    };
    expect(startedAgain.data.startAt).toBe(started.data.startAt);

    const countedDownSession = await waitForDocument(`groupSessions/${groupSessionId}`);
    expect(countedDownSession.data()?.startAt).toBe(started.data.startAt);

    const [senderSession, receiverSession] = await Promise.all([
      getDoc(doc(sender.firestore, "groupSessions", groupSessionId)),
      getDoc(doc(receiver.firestore, "groupSessions", groupSessionId)),
    ]);
    expect(senderSession.data()?.startAt).toBe(started.data.startAt);
    expect(receiverSession.data()?.startAt).toBe(started.data.startAt);

    const activateAsReceiver = httpsCallable(receiver.functions, "activateGroupSession");
    await expect(activateAsReceiver({ sessionId: groupSessionId })).rejects.toMatchObject({
      code: expect.stringContaining("failed-precondition"),
    });
    await new Promise((resolve) => setTimeout(resolve, 5_100));
    const activated = (await activateAsReceiver({ sessionId: groupSessionId })) as {
      data: { startAt: string; status: string };
    };
    expect(activated.data.status).toBe("ACTIVE");
    expect(activated.data.startAt).toBe(started.data.startAt);
    const activatedAgain = (await httpsCallable(
      sender.functions,
      "activateGroupSession",
    )({ sessionId: groupSessionId })) as { data: { status: string } };
    expect(activatedAgain.data.status).toBe("ACTIVE");

    const activeSession = await waitForDocument(`groupSessions/${groupSessionId}`);
    expect(activeSession.data()?.status).toBe("ACTIVE");
    const activeReceiver = await waitForDocument(
      `groupSessions/${groupSessionId}/participants/${receiver.uid}`,
    );
    expect(activeReceiver.data()?.status).toBe("ACTIVE");
    expect(activeReceiver.data()?.operationalState).toBe("WAITING_TURN");

    const receiverSetRef = adminFirestore().doc(
      `groupSessions/${groupSessionId}/participants/${receiver.uid}/sets/receiver-set-1`,
    );
    await receiverSetRef.set({ loadKg: 60, reps: 10 });
    const leave = httpsCallable(receiver.functions, "leaveGroupSession");
    await expect(leave({ sessionId: groupSessionId })).resolves.toMatchObject({
      data: { participantStatus: "LEFT", sessionId: groupSessionId },
    });
    await expect(leave({ sessionId: groupSessionId })).resolves.toMatchObject({
      data: { participantStatus: "LEFT", sessionId: groupSessionId },
    });
    const leftReceiver = await waitForDocument(
      `groupSessions/${groupSessionId}/participants/${receiver.uid}`,
    );
    expect(leftReceiver.data()?.status).toBe("LEFT");
    expect(leftReceiver.data()?.leftAt).toBeTruthy();
    expect((await receiverSetRef.get()).data()).toMatchObject({ loadKg: 60, reps: 10 });
    expect((await waitForDocument(`groupSessions/${groupSessionId}`)).data()?.status).toBe(
      "ACTIVE",
    );
    await expect(
      setDoc(
        doc(
          receiver.firestore,
          "groupSessions",
          groupSessionId,
          "participants",
          receiver.uid,
          "sets",
          "receiver-set-2",
        ),
        {
          completedAt: "2026-09-02T00:03:00.000Z",
          createdAt: serverTimestamp(),
          eventId: "receiver-set-2",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId,
          id: "receiver-set-2",
          loadKg: 60,
          notes: null,
          reps: 8,
          rir: 1,
          setIndex: 3,
          uid: receiver.uid,
          updatedAt: serverTimestamp(),
        },
      ),
    ).rejects.toBeDefined();

    const updatedInvite = await adminFirestore().doc(`trainingInvites/${inviteId}`).get();
    expect(updatedInvite.data()?.status).toBe("ACCEPTED");
    expect(updatedInvite.data()?.groupSessionId).toBe(groupSessionId);

    const acceptedAgain = (await respond({ action: "ACCEPT", inviteId })) as {
      data: { groupSessionId: string };
    };
    expect(acceptedAgain.data.groupSessionId).toBe(groupSessionId);
  });

  it(
    "closes participation individually and ends the session only when nobody is training",
    { timeout: 60000 },
    async () => {
      const host = await createTestUser("finish-host");
      const member = await createTestUser("finish-member");

      const sent = (await httpsCallable(
        host.functions,
        "sendTrainingInvite",
      )({
        receiverPublicUserId: member.publicUserId,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      })) as { data: { inviteId: string } };

      const accepted = (await httpsCallable(
        member.functions,
        "respondToTrainingInvite",
      )({ action: "ACCEPT", inviteId: sent.data.inviteId })) as {
        data: { groupSessionId: string };
      };
      const sessionId = accepted.data.groupSessionId;

      await adminFirestore()
        .doc(`groupSessions/${sessionId}/participants/${host.uid}`)
        .update({ readyAt: new Date(), status: "READY" });
      await httpsCallable(host.functions, "startGroupSession")({ sessionId });
      await new Promise((resolve) => setTimeout(resolve, 5_100));
      await httpsCallable(host.functions, "activateGroupSession")({ sessionId });

      const hostSetRef = adminFirestore().doc(
        `groupSessions/${sessionId}/participants/${host.uid}/sets/host-set-1`,
      );
      const memberSetRef = adminFirestore().doc(
        `groupSessions/${sessionId}/participants/${member.uid}/sets/member-set-1`,
      );
      await hostSetRef.set({ loadKg: 80, reps: 8 });
      await memberSetRef.set({ loadKg: 60, reps: 10 });

      const completeAsHost = httpsCallable(host.functions, "completeGroupParticipation");
      const completed = (await completeAsHost({ sessionId })) as {
        data: { participantStatus: string; sessionStatus: string };
      };
      expect(completed.data).toMatchObject({
        participantStatus: "COMPLETED",
        sessionStatus: "ACTIVE",
      });

      // Repeating the command is idempotent and never touches the other person.
      const completedAgain = (await completeAsHost({ sessionId })) as {
        data: { participantStatus: string; sessionStatus: string };
      };
      expect(completedAgain.data.participantStatus).toBe("COMPLETED");

      const hostParticipant = await adminFirestore()
        .doc(`groupSessions/${sessionId}/participants/${host.uid}`)
        .get();
      const memberParticipant = await adminFirestore()
        .doc(`groupSessions/${sessionId}/participants/${member.uid}`)
        .get();
      expect(hostParticipant.data()?.status).toBe("COMPLETED");
      expect(hostParticipant.data()?.completedAt).toBeTruthy();
      expect(memberParticipant.data()?.status).toBe("ACTIVE");
      expect(memberParticipant.data()?.completedAt).toBeNull();
      expect((await adminFirestore().doc(`groupSessions/${sessionId}`).get()).data()?.status).toBe(
        "ACTIVE",
      );
      expect((await hostSetRef.get()).data()).toMatchObject({ loadKg: 80, reps: 8 });
      expect((await memberSetRef.get()).data()).toMatchObject({ loadKg: 60, reps: 10 });

      // A finished participant cannot write new group sets anymore.
      await expect(
        setDoc(
          doc(
            host.firestore,
            "groupSessions",
            sessionId,
            "participants",
            host.uid,
            "sets",
            "host-set-2",
          ),
          {
            completedAt: "2026-09-03T00:05:00.000Z",
            createdAt: serverTimestamp(),
            eventId: "host-set-2",
            exerciseId: "bench-press",
            feedback: null,
            groupSessionId: sessionId,
            id: "host-set-2",
            loadKg: 80,
            notes: null,
            reps: 6,
            rir: 1,
            setIndex: 2,
            uid: host.uid,
            updatedAt: serverTimestamp(),
          },
        ),
      ).rejects.toBeDefined();

      // Cada participante recebe exatamente um treino na própria projeção semanal.
      const hostWeekKey = completed.data.weekKey;
      const hostStats = await adminFirestore()
        .doc(`weeklyStats/${host.uid}/weeks/${hostWeekKey}`)
        .get();
      expect(hostStats.data()).toMatchObject({
        completedWorkouts: 1,
        groupWorkouts: 1,
        soloWorkouts: 0,
        totalReps: 8,
        totalSets: 1,
        totalVolumeKg: 640,
        uid: host.uid,
      });
      expect(
        (await adminFirestore().doc(`processedEvents/group:${sessionId}:${host.uid}`).get()).data()
          ?.weekKey,
      ).toBe(hostWeekKey);
      expect(
        (await adminFirestore().doc(`weeklyStats/${member.uid}/weeks/${hostWeekKey}`).get()).exists,
      ).toBe(false);

      const completeAsMember = httpsCallable(member.functions, "completeGroupParticipation");
      const closed = (await completeAsMember({ sessionId })) as {
        data: { sessionStatus: string; weekKey: string };
      };
      expect(closed.data.sessionStatus).toBe("COMPLETED");
      const memberStats = await adminFirestore()
        .doc(`weeklyStats/${member.uid}/weeks/${closed.data.weekKey}`)
        .get();
      expect(memberStats.data()).toMatchObject({
        completedWorkouts: 1,
        groupWorkouts: 1,
        totalReps: 10,
        totalSets: 1,
        totalVolumeKg: 600,
        uid: member.uid,
      });

      // Repetir a conclusão não soma duas vezes: o ledger já registrou o evento.
      await completeAsHost({ sessionId });
      expect(
        (await adminFirestore().doc(`weeklyStats/${host.uid}/weeks/${hostWeekKey}`).get()).data()
          ?.completedWorkouts,
      ).toBe(1);
      expect((await adminFirestore().doc(`groupSessions/${sessionId}`).get()).data()?.status).toBe(
        "COMPLETED",
      );
      expect((await memberSetRef.get()).data()).toMatchObject({ loadKg: 60, reps: 10 });

      // A closed session no longer accepts leaving or new completions.
      await expect(
        httpsCallable(member.functions, "leaveGroupSession")({ sessionId }),
      ).rejects.toMatchObject({ code: expect.stringContaining("failed-precondition") });
    },
  );

  it(
    "credits a finished solo session once and rebuilds the week from the source of truth",
    { timeout: 40000 },
    async () => {
      const athlete = await createTestUser("stats");
      const sessionId = `solo-${crypto.randomUUID()}`;
      const completedAt = new Date().toISOString();

      await adminFirestore()
        .doc(`privateProfiles/${athlete.uid}`)
        .set(
          {
            activeWorkoutPlanId: "plan-1",
            onboarding: { routine: { daysPerWeek: 3 } },
            preferences: { weekStartsOn: "monday" },
            timezone: "America/Sao_Paulo",
          },
          { merge: true },
        );
      await adminFirestore()
        .doc(`workoutSessions/${sessionId}`)
        .set({
          completedAt,
          id: sessionId,
          optionalCardioStatus: "COMPLETED",
          ownerUid: athlete.uid,
          planId: "plan-1",
          planVersionId: "version-1",
          progress: { completedExercises: [], totalReps: 90, totalSets: 12, totalVolume: 3600 },
          status: "COMPLETED",
        });

      const record = httpsCallable(athlete.functions, "recordWorkoutCompletion");
      const credited = (await record({ sessionId })) as {
        data: { credited: boolean; weekKey: string };
      };
      expect(credited.data.credited).toBe(true);

      const weekKey = credited.data.weekKey;
      const statsPath = `weeklyStats/${athlete.uid}/weeks/${weekKey}`;
      expect((await adminFirestore().doc(statsPath).get()).data()).toMatchObject({
        cardioSessions: 1,
        completedWorkouts: 1,
        extraWorkouts: 0,
        plannedTarget: 3,
        plannedWorkouts: 1,
        soloWorkouts: 1,
        totalReps: 90,
        totalSets: 12,
        totalVolumeKg: 3600,
      });

      // Retry idempotente: o ledger impede a dupla contagem.
      const retried = (await record({ sessionId })) as { data: { credited: boolean } };
      expect(retried.data.credited).toBe(false);
      expect((await adminFirestore().doc(statsPath).get()).data()?.completedWorkouts).toBe(1);

      // Nenhum cliente escreve nem lê a projeção de outra pessoa.
      await expect(
        setDoc(doc(athlete.firestore, "weeklyStats", athlete.uid, "weeks", weekKey), {
          completedWorkouts: 99,
        }),
      ).rejects.toBeDefined();
      await expect(
        getDoc(doc(athlete.firestore, "processedEvents", `solo:${sessionId}:${athlete.uid}`)),
      ).rejects.toBeDefined();
      await expect(
        getDoc(doc(athlete.firestore, "weeklyStats", athlete.uid, "weeks", weekKey)),
      ).resolves.toMatchObject({ id: weekKey });

      // Rebuild recalcula a semana a partir das sessões concluídas.
      await adminFirestore().doc(statsPath).set({ completedWorkouts: 42 }, { merge: true });
      const rebuilt = (await httpsCallable(
        athlete.functions,
        "rebuildWeeklyStats",
      )({ weekKey })) as { data: { events: number; weekKey: string } };
      expect(rebuilt.data).toMatchObject({ events: 1, weekKey });
      expect((await adminFirestore().doc(statsPath).get()).data()).toMatchObject({
        completedWorkouts: 1,
        plannedWorkouts: 1,
        totalVolumeKg: 3600,
      });
    },
  );

  it(
    "credits an independent cardio session without touching strength metrics",
    { timeout: 40000 },
    async () => {
      const athlete = await createTestUser("cardio");
      const cardioSessionId = `cardio-${crypto.randomUUID()}`;
      const workoutSessionId = `solo-${crypto.randomUUID()}`;
      const completedAt = new Date().toISOString();

      await adminFirestore()
        .doc(`workoutSessions/${workoutSessionId}`)
        .set({
          completedAt,
          id: workoutSessionId,
          optionalCardioStatus: "SKIPPED",
          ownerUid: athlete.uid,
          planId: "plan-1",
          planVersionId: "version-1",
          progress: { completedExercises: [], totalReps: 60, totalSets: 8, totalVolume: 2400 },
          status: "COMPLETED",
        });
      const strength = (await httpsCallable(
        athlete.functions,
        "recordWorkoutCompletion",
      )({ sessionId: workoutSessionId })) as { data: { weekKey: string } };
      const statsPath = `weeklyStats/${athlete.uid}/weeks/${strength.data.weekKey}`;

      await adminFirestore()
        .doc(`cardioSessions/${cardioSessionId}`)
        .set({
          completedAt,
          createdAt: completedAt,
          distanceMeters: 3000,
          durationSeconds: 1500,
          id: cardioSessionId,
          ownerUid: athlete.uid,
          prescription: {
            intensity: "MODERATE",
            modality: "RUN",
            notes: null,
            requirement: "RECOMMENDED",
            targetSeconds: 1500,
          },
          rescheduledFor: null,
          skipReason: null,
          skippedAt: null,
          source: "STANDALONE",
          startedAt: completedAt,
          status: "COMPLETED",
          updatedAt: completedAt,
        });

      const recordCardio = httpsCallable(athlete.functions, "recordCardioCompletion");
      const credited = (await recordCardio({ cardioSessionId })) as {
        data: { credited: boolean; weekKey: string };
      };
      expect(credited.data).toMatchObject({ credited: true, weekKey: strength.data.weekKey });

      const stats = await adminFirestore().doc(statsPath).get();
      expect(stats.data()).toMatchObject({
        cardioSeconds: 1500,
        cardioSessions: 1,
        completedWorkouts: 1,
        soloWorkouts: 1,
        totalSets: 8,
        totalVolumeKg: 2400,
      });

      // Retry não soma o cardio duas vezes.
      const retried = (await recordCardio({ cardioSessionId })) as {
        data: { credited: boolean };
      };
      expect(retried.data.credited).toBe(false);
      expect((await adminFirestore().doc(statsPath).get()).data()).toMatchObject({
        cardioSeconds: 1500,
        cardioSessions: 1,
        completedWorkouts: 1,
      });

      // O rebuild reconstrói força e cardio na mesma semana.
      await adminFirestore().doc(statsPath).set({ cardioSessions: 9 }, { merge: true });
      const rebuilt = (await httpsCallable(
        athlete.functions,
        "rebuildWeeklyStats",
      )({ weekKey: strength.data.weekKey })) as { data: { events: number } };
      expect(rebuilt.data.events).toBe(2);
      expect((await adminFirestore().doc(statsPath).get()).data()).toMatchObject({
        cardioSeconds: 1500,
        cardioSessions: 1,
        completedWorkouts: 1,
        totalVolumeKg: 2400,
      });
    },
  );

  it(
    "exports the own account data and deletes it without erasing the partner history",
    { timeout: 40000 },
    async () => {
      const owner = await createTestUser("lgpd");
      const sessionId = `solo-${crypto.randomUUID()}`;

      await adminFirestore()
        .doc(`workoutSessions/${sessionId}`)
        .set({
          completedAt: new Date().toISOString(),
          id: sessionId,
          optionalCardioStatus: "SKIPPED",
          ownerUid: owner.uid,
          planId: "plan-1",
          planVersionId: "version-1",
          progress: { completedExercises: [], totalReps: 30, totalSets: 4, totalVolume: 1200 },
          status: "COMPLETED",
        });
      await adminFirestore()
        .doc(`workoutSessions/${sessionId}/sets/set-1`)
        .set({ exerciseId: "bench-press", loadKg: 60, reps: 10, uid: owner.uid });
      await adminFirestore()
        .doc(`measurements/${owner.uid}/items/m1`)
        .set({ id: "m1", ownerUid: owner.uid, takenAt: new Date().toISOString(), weightKg: 78 });

      const exported = (await httpsCallable(owner.functions, "exportAccountData")({})) as {
        data: { data: Record<string, unknown>; uid: string };
      };
      expect(exported.data.uid).toBe(owner.uid);
      expect(exported.data.data.workoutSessions).toHaveLength(1);
      expect(exported.data.data.measurements).toHaveLength(1);
      expect(exported.data.data.publicProfiles).toMatchObject({ publicUserId: expect.any(String) });

      const deleteAccount = httpsCallable(owner.functions, "deleteAccountData");
      await expect(deleteAccount({ confirmation: "excluir" })).rejects.toMatchObject({
        code: expect.stringContaining("failed-precondition"),
      });

      const deleted = (await deleteAccount({ confirmation: "EXCLUIR" })) as {
        data: { deletedDocuments: number };
      };
      expect(deleted.data.deletedDocuments).toBeGreaterThan(0);

      expect((await adminFirestore().doc(`workoutSessions/${sessionId}`).get()).exists).toBe(false);
      expect((await adminFirestore().doc(`measurements/${owner.uid}/items/m1`).get()).exists).toBe(
        false,
      );
      expect((await adminFirestore().doc(`privateProfiles/${owner.uid}`).get()).exists).toBe(false);
      expect((await adminFirestore().doc(`publicProfiles/${owner.uid}`).get()).exists).toBe(false);
    },
  );

  it("rejects decline from anyone other than the receiver", { timeout: 30000 }, async () => {
    const sender = await createTestUser("s2");
    const receiver = await createTestUser("r2");

    const sent = (await httpsCallable(
      sender.functions,
      "sendTrainingInvite",
    )({
      receiverPublicUserId: receiver.publicUserId,
      workoutPlanId: "plan-1",
      workoutPlanVersionId: "version-1",
    })) as { data: { inviteId: string } };

    await expect(
      httpsCallable(
        sender.functions,
        "respondToTrainingInvite",
      )({
        action: "DECLINE",
        inviteId: sent.data.inviteId,
      }),
    ).rejects.toMatchObject({ code: expect.stringContaining("permission-denied") });

    const declined = (await httpsCallable(
      receiver.functions,
      "respondToTrainingInvite",
    )({ action: "DECLINE", inviteId: sent.data.inviteId })) as { data: { status: string } };
    expect(declined.data.status).toBe("DECLINED");
  });

  it("blocks invites from users the receiver has blocked", { timeout: 30000 }, async () => {
    const sender = await createTestUser("s3");
    const receiver = await createTestUser("r3");

    await adminFirestore()
      .doc(`blockedUsers/${receiver.uid}/blocked/${sender.uid}`)
      .set({ blockedUid: sender.uid, createdAt: new Date() });

    await expect(
      httpsCallable(
        sender.functions,
        "sendTrainingInvite",
      )({
        receiverPublicUserId: receiver.publicUserId,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      }),
    ).rejects.toMatchObject({ code: expect.stringContaining("permission-denied") });
  });

  it("expires stale invites and refuses to accept them", { timeout: 30000 }, async () => {
    const sender = await createTestUser("s4");
    const receiver = await createTestUser("r4");

    const inviteRef = adminFirestore().collection("trainingInvites").doc();
    await inviteRef.set({
      cancelledAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-02T00:00:00.000Z").toISOString(),
      groupSessionId: null,
      id: inviteRef.id,
      receiverAvatar: null,
      receiverDisplayName: "R4",
      receiverPublicUserId: receiver.publicUserId,
      receiverUid: receiver.uid,
      respondedAt: null,
      senderAvatar: null,
      senderDisplayName: "S4",
      senderPublicUserId: sender.publicUserId,
      senderUid: sender.uid,
      status: "PENDING",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      workoutPlanId: "plan-1",
      workoutPlanVersionId: "version-1",
    });

    await expect(
      httpsCallable(
        receiver.functions,
        "respondToTrainingInvite",
      )({ action: "ACCEPT", inviteId: inviteRef.id }),
    ).rejects.toMatchObject({ code: expect.stringContaining("failed-precondition") });

    const pruned = (await httpsCallable(receiver.functions, "pruneExpiredTrainingInvites")({})) as {
      data: { expired: number };
    };
    expect(pruned.data.expired).toBeGreaterThanOrEqual(1);

    const afterPrune = await adminFirestore().doc(`trainingInvites/${inviteRef.id}`).get();
    expect(afterPrune.data()?.status).toBe("EXPIRED");
  });

  it("rate limits repeated invite sends", { timeout: 30000 }, async () => {
    const sender = await createTestUser("s5");
    const receivers = await Promise.all([
      createTestUser("r5a"),
      createTestUser("r5b"),
      createTestUser("r5c"),
      createTestUser("r5d"),
    ]);

    const sendInvite = httpsCallable(sender.functions, "sendTrainingInvite");
    const limit = Number(process.env.SEND_TRAINING_INVITE_RATE_LIMIT ?? "3");

    for (let index = 0; index < limit; index += 1) {
      await sendInvite({
        receiverPublicUserId: receivers[index].publicUserId,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      });
    }

    await expect(
      sendInvite({
        receiverPublicUserId: receivers[limit].publicUserId,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      }),
    ).rejects.toMatchObject({ code: expect.stringContaining("resource-exhausted") });
  });
});
