import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

if (!emulatorHost) {
  throw new Error("Firestore integration tests must run through Firebase Emulator Suite.");
}

const [host, port] = emulatorHost.split(":");
let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: "willtreino-local",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnvironment?.cleanup();
});

describe("Firestore baseline rules", () => {
  it("allows owners to read and update their own profile documents", async () => {
    const ownerContext = testEnvironment.authenticatedContext("alice");
    const firestore = ownerContext.firestore();

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await setDoc(doc(adminFirestore, "publicProfiles", "alice"), {
        avatar: null,
        badgesPublic: [],
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        displayName: "Alice",
        publicUserId: "WT-7FK3-Q9LP",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        username: null,
      });
      await setDoc(doc(adminFirestore, "privateProfiles", "alice"), {
        birthDate: null,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        locale: "pt-BR",
        onboardingVersion: 1,
        preferences: {
          simplifiedMode: false,
          weekStartsOn: "monday",
        },
        timezone: "America/Sao_Paulo",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      });
    });

    await assertSucceeds(getDoc(doc(firestore, "publicProfiles", "alice")));
    await assertSucceeds(getDoc(doc(firestore, "privateProfiles", "alice")));
    await assertSucceeds(
      updateDoc(doc(firestore, "publicProfiles", "alice"), {
        avatar: "https://cdn.example/avatar.png",
        displayName: "Alice Nova",
        username: "alice",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(firestore, "privateProfiles", "alice"), {
        onboarding: {
          accessibility: {
            needAcknowledgement: "yes",
            needs: ["baixa_visao"],
          },
          cardioPreference: "recommended",
          completedStepIds: ["goal"],
          currentStepId: "routine",
          equipment: ["halteres"],
          experience: "iniciante",
          functionalAbilities: {
            comfortableMovements: "agachamento",
          },
          goal: "ganhar_massa",
          groupTrainingPreference: "with_someone",
          location: "Academia",
          nutritionBudgetCents: 60000,
          physicalProfile: {
            heightCm: 180,
            weightKg: 82.5,
          },
          presentationAcknowledged: true,
          routine: {
            daysPerWeek: 4,
            sessionMinutes: 60,
          },
          safetyNotes: "Nenhuma no momento",
          summaryAcknowledged: false,
          timezone: "America/Sao_Paulo",
        },
        locale: "en-US",
      }),
    );
  });

  it("denies non-owner and anonymous access to private and server-only documents", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await setDoc(doc(adminFirestore, "publicProfiles", "alice"), {
        avatar: null,
        badgesPublic: [],
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        displayName: "Alice",
        publicUserId: "WT-7FK3-Q9LP",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        username: null,
      });
      await setDoc(doc(adminFirestore, "privateProfiles", "alice"), {
        birthDate: null,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        locale: "pt-BR",
        onboardingVersion: 1,
        preferences: {
          simplifiedMode: false,
          weekStartsOn: "monday",
        },
        timezone: "America/Sao_Paulo",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      });
      await setDoc(doc(adminFirestore, "healthProfiles", "alice"), {
        notes: "private",
      });
      await setDoc(doc(adminFirestore, "accessibilityProfiles", "alice"), {
        needsAccommodation: true,
      });
      await setDoc(doc(adminFirestore, "nutritionProfiles", "alice"), {
        budgetCents: 60000,
      });
      await setDoc(doc(adminFirestore, "userSettings", "alice"), {
        simplifiedMode: false,
      });
    });

    const anonymousFirestore = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousFirestore, "publicProfiles", "alice")));

    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bobFirestore, "privateProfiles", "alice")));
    await assertFails(getDoc(doc(bobFirestore, "healthProfiles", "alice")));
    await assertFails(getDoc(doc(bobFirestore, "accessibilityProfiles", "alice")));
    await assertFails(getDoc(doc(bobFirestore, "nutritionProfiles", "alice")));
    await assertFails(getDoc(doc(bobFirestore, "userSettings", "alice")));
    await assertFails(getDoc(doc(bobFirestore, "publicUserIdIndex", "WT7FK3Q9LP")));
    await assertFails(
      updateDoc(doc(bobFirestore, "publicUserIdIndex", "WT7FK3Q9LP"), {
        uid: "bob",
      }),
    );
  });

  it("denies changing immutable public user identifiers", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await setDoc(doc(adminFirestore, "publicProfiles", "alice"), {
        avatar: null,
        badgesPublic: [],
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        displayName: "Alice",
        publicUserId: "WT-7FK3-Q9LP",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        username: null,
      });
    });

    await assertFails(
      updateDoc(doc(aliceFirestore, "publicProfiles", "alice"), {
        publicUserId: "WT-AAAA-BBBB",
      }),
    );
  });

  it("authorizes workout sessions and sets only for the owner", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceFirestore, "workoutSessions", "session-1"), {
        completedAt: null,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        ownerUid: "alice",
        planId: "plan-1",
        planVersionId: "version-1",
        startedAt: null,
        status: "PLANNED",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
    );
    await assertSucceeds(
      setDoc(doc(aliceFirestore, "workoutSessions", "session-1", "sets", "set-1"), {
        completedAt: null,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        feedback: null,
        loadKg: 80,
        notes: null,
        reps: 10,
        rir: 2,
        sessionId: "session-1",
        setIndex: 1,
        uid: "alice",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
    );
    await assertSucceeds(getDoc(doc(aliceFirestore, "workoutSessions", "session-1")));
    await assertFails(getDoc(doc(bobFirestore, "workoutSessions", "session-1")));
    await assertFails(
      updateDoc(doc(bobFirestore, "workoutSessions", "session-1"), {
        status: "ACTIVE",
      }),
    );
    await assertFails(
      setDoc(doc(bobFirestore, "workoutSessions", "session-1", "sets", "set-2"), {
        completedAt: null,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        feedback: null,
        loadKg: 60,
        notes: null,
        reps: 10,
        rir: 2,
        sessionId: "session-1",
        setIndex: 2,
        uid: "bob",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
    );
  });

  it("accepts the complete solo session shape persisted by the workout client", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const now = new Date("2026-09-02T00:00:00.000Z");

    await assertSucceeds(
      setDoc(doc(aliceFirestore, "workoutSessions", "session-complete-shape"), {
        completedAt: null,
        createdAt: "2026-09-02T00:00:00.000Z",
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        currentWorkoutExerciseId: "goblet-squat",
        currentWorkoutExerciseName: "Agachamento goblet",
        exerciseQueue: [],
        id: "session-complete-shape",
        lastSetCompletedAt: null,
        optionalCardioCompletedAt: null,
        optionalCardioSkippedAt: null,
        optionalCardioStatus: "NOT_STARTED",
        ownerUid: "alice",
        planId: "plan-1",
        planVersionId: "version-1",
        progress: {
          completedExercises: [],
          totalReps: 0,
          totalSets: 0,
          totalVolume: 0,
        },
        recoveryFeedback: null,
        restExpectedEndAt: null,
        restStartedAt: null,
        restTargetSeconds: 0,
        startedAt: "2026-09-02T00:00:00.000Z",
        status: "ACTIVE",
        updatedAt: now,
      }),
    );

    await assertSucceeds(
      updateDoc(doc(aliceFirestore, "workoutSessions", "session-complete-shape"), {
        currentSetIndex: 1,
        lastSetCompletedAt: "2026-09-02T00:01:00.000Z",
        progress: {
          completedExercises: [],
          totalReps: 10,
          totalSets: 1,
          totalVolume: 400,
        },
        recoveryFeedback: "Energia está boa.",
        updatedAt: new Date("2026-09-02T00:01:00.000Z"),
      }),
    );
  });

  it("authorizes group sessions only for participants and host", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await setDoc(doc(adminFirestore, "groupSessions", "group-1"), {
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        hostUid: "alice",
        sharedEquipmentMode: "PARTIAL",
        stationMode: "ROTATION_SHARED_STATION",
        status: "LOBBY",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        weightChangeMode: "NORMAL",
        weightChangeSeconds: null,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      });
      await setDoc(doc(adminFirestore, "groupSessions", "group-1", "participants", "alice"), {
        completedAt: null,
        joinedAt: new Date("2026-09-02T00:00:00.000Z"),
        displaySnapshot: {
          avatar: null,
          displayName: "Alice",
          publicUserId: "WT-AAAA-BBBB",
        },
        leftAt: null,
        readyAt: null,
        role: "HOST",
        status: "INVITED",
        uid: "alice",
      });
      await setDoc(doc(adminFirestore, "groupSessions", "group-1", "participants", "bob"), {
        completedAt: null,
        joinedAt: new Date("2026-09-02T00:00:00.000Z"),
        displaySnapshot: {
          avatar: null,
          displayName: "Bob",
          publicUserId: "WT-CCCC-DDDD",
        },
        leftAt: null,
        readyAt: null,
        role: "MEMBER",
        status: "INVITED",
        uid: "bob",
      });
      await setDoc(
        doc(adminFirestore, "groupSessions", "group-1", "participants", "alice", "sets", "set-1"),
        {
          completedAt: "2026-09-02T00:01:00.000Z",
          createdAt: new Date("2026-09-02T00:00:00.000Z"),
          eventId: "set-1",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-1",
          id: "set-1",
          loadKg: 80,
          notes: null,
          reps: 10,
          rir: 2,
          setIndex: 1,
          uid: "alice",
          updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        },
      );
      await setDoc(
        doc(adminFirestore, "groupSessions", "group-1", "participants", "bob", "sets", "set-1"),
        {
          completedAt: "2026-09-02T00:01:00.000Z",
          createdAt: new Date("2026-09-02T00:00:00.000Z"),
          eventId: "set-1",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-1",
          id: "set-1",
          loadKg: 60,
          notes: null,
          reps: 10,
          rir: 2,
          setIndex: 1,
          uid: "bob",
          updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        },
      );
    });

    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();
    const charlieFirestore = testEnvironment.authenticatedContext("charlie").firestore();

    await assertSucceeds(getDoc(doc(aliceFirestore, "groupSessions", "group-1")));
    await assertSucceeds(
      getDoc(doc(aliceFirestore, "groupSessions", "group-1", "participants", "bob")),
    );
    await assertSucceeds(getDoc(doc(bobFirestore, "groupSessions", "group-1")));
    await assertSucceeds(
      updateDoc(doc(aliceFirestore, "groupSessions", "group-1"), {
        sharedEquipmentMode: "FULL",
        stationMode: "ROTATION_SHARED_STATION",
        weightChangeMode: "FAST",
        weightChangeSeconds: null,
      }),
    );
    await assertFails(
      updateDoc(doc(aliceFirestore, "groupSessions", "group-1"), {
        startAt: "2026-09-02T00:00:05.000Z",
        status: "COUNTDOWN",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(bobFirestore, "groupSessions", "group-1", "participants", "bob"), {
        readyAt: new Date("2026-09-02T00:10:00.000Z"),
        status: "READY",
      }),
    );
    await assertFails(getDoc(doc(charlieFirestore, "groupSessions", "group-1")));
    await assertFails(
      updateDoc(doc(bobFirestore, "groupSessions", "group-1"), {
        sharedEquipmentMode: "NONE",
      }),
    );
    await assertFails(
      updateDoc(doc(bobFirestore, "groupSessions", "group-1", "participants", "bob"), {
        role: "HOST",
      }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "groupSessions", "client-created"), {
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        hostUid: "alice",
        sharedEquipmentMode: "FULL",
        stationMode: "ROTATION_SHARED_STATION",
        status: "LOBBY",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        weightChangeMode: "NORMAL",
        weightChangeSeconds: null,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      }),
    );
    await assertFails(
      getDoc(doc(charlieFirestore, "groupSessions", "group-1", "participants", "bob")),
    );
    await assertFails(
      updateDoc(
        doc(bobFirestore, "groupSessions", "group-1", "participants", "alice", "sets", "set-1"),
        {
          loadKg: 70,
        },
      ),
    );
    await assertFails(
      getDoc(
        doc(aliceFirestore, "groupSessions", "group-1", "participants", "bob", "sets", "set-1"),
      ),
    );
    await assertFails(
      updateDoc(
        doc(aliceFirestore, "groupSessions", "group-1", "participants", "alice", "sets", "set-1"),
        {
          loadKg: 82.5,
        },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(aliceFirestore, "groupSessions", "group-1", "participants", "alice", "sets", "set-2"),
        {
          completedAt: "2026-09-02T00:02:00.000Z",
          createdAt: serverTimestamp(),
          eventId: "set-2",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-1",
          id: "set-2",
          loadKg: 82.5,
          notes: null,
          reps: 8,
          rir: 1,
          setIndex: 2,
          uid: "alice",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(bobFirestore, "groupSessions", "group-1", "participants", "bob", "sets", "set-2"),
        {
          completedAt: "2026-09-02T00:02:00.000Z",
          createdAt: serverTimestamp(),
          eventId: "set-2",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-1",
          id: "set-2",
          loadKg: 60,
          notes: null,
          reps: 10,
          rir: 2,
          setIndex: 2,
          uid: "bob",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(bobFirestore, "groupSessions", "group-1", "participants", "bob", "sets", "set-3"),
        {
          completedAt: "2026-09-02T00:02:00.000Z",
          createdAt: new Date("2026-09-02T00:02:00.000Z"),
          eventId: "set-3",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-1",
          id: "set-3",
          loadKg: 60,
          notes: null,
          reps: 8,
          rir: 1,
          setIndex: 2,
          uid: "alice",
          updatedAt: new Date("2026-09-02T00:02:00.000Z"),
        },
      ),
    );

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await updateDoc(doc(adminFirestore, "groupSessions", "group-1"), { status: "ACTIVE" });
      await updateDoc(doc(adminFirestore, "groupSessions", "group-1", "participants", "alice"), {
        operationalState: "WAITING_TURN",
        operationalStateUpdatedAt: new Date("2026-09-02T00:03:00.000Z"),
        status: "ACTIVE",
      });
      await updateDoc(doc(adminFirestore, "groupSessions", "group-1", "participants", "bob"), {
        operationalState: "WAITING_TURN",
        operationalStateUpdatedAt: new Date("2026-09-02T00:03:00.000Z"),
        status: "ACTIVE",
      });
    });

    await assertSucceeds(
      updateDoc(doc(aliceFirestore, "groupSessions", "group-1", "participants", "alice"), {
        operationalState: "RESTING",
        operationalStateUpdatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(aliceFirestore, "groupSessions", "group-1", "participants", "bob"), {
        operationalState: "PERFORMING_SET",
        operationalStateUpdatedAt: serverTimestamp(),
      }),
    );

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await updateDoc(doc(adminFirestore, "groupSessions", "group-1", "participants", "bob"), {
        leftAt: new Date("2026-09-02T00:04:00.000Z"),
        operationalState: "PAUSED",
        operationalStateUpdatedAt: new Date("2026-09-02T00:04:00.000Z"),
        status: "LEFT",
      });
    });

    await assertFails(
      setDoc(
        doc(bobFirestore, "groupSessions", "group-1", "participants", "bob", "sets", "set-3"),
        {
          completedAt: "2026-09-02T00:04:00.000Z",
          createdAt: serverTimestamp(),
          eventId: "set-3",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-1",
          id: "set-3",
          loadKg: 60,
          notes: null,
          reps: 8,
          rir: 1,
          setIndex: 3,
          uid: "bob",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(doc(bobFirestore, "groupSessions", "group-1", "participants", "bob"), {
        operationalState: "WAITING_TURN",
        operationalStateUpdatedAt: serverTimestamp(),
      }),
    );
  });

  it("keeps group partners' private data invisible and freezes a completed participation", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      await setDoc(doc(adminFirestore, "groupSessions", "group-privacy"), {
        createdAt: new Date("2026-09-03T00:00:00.000Z"),
        hostUid: "alice",
        sharedEquipmentMode: "FULL",
        startAt: "2026-09-03T00:00:05.000Z",
        stationMode: "ROTATION_SHARED_STATION",
        status: "ACTIVE",
        updatedAt: new Date("2026-09-03T00:00:00.000Z"),
        weightChangeMode: "NORMAL",
        weightChangeSeconds: null,
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      });
      for (const [uid, role] of [
        ["alice", "HOST"],
        ["bob", "MEMBER"],
      ] as const) {
        await setDoc(doc(adminFirestore, "groupSessions", "group-privacy", "participants", uid), {
          completedAt: null,
          displaySnapshot: {
            avatar: null,
            displayName: uid === "alice" ? "Alice" : "Bob",
            publicUserId: uid === "alice" ? "WT-AAAA-BBBB" : "WT-CCCC-DDDD",
          },
          joinedAt: new Date("2026-09-03T00:00:00.000Z"),
          leftAt: null,
          operationalState: "WAITING_TURN",
          operationalStateUpdatedAt: new Date("2026-09-03T00:00:00.000Z"),
          readyAt: new Date("2026-09-03T00:00:00.000Z"),
          role,
          status: "ACTIVE",
          uid,
        });
      }
      await setDoc(
        doc(
          adminFirestore,
          "groupSessions",
          "group-privacy",
          "participants",
          "bob",
          "sets",
          "set-1",
        ),
        {
          completedAt: "2026-09-03T00:01:00.000Z",
          createdAt: new Date("2026-09-03T00:01:00.000Z"),
          eventId: "set-1",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-privacy",
          id: "set-1",
          loadKg: 62.5,
          notes: null,
          reps: 10,
          rir: 2,
          setIndex: 1,
          uid: "bob",
          updatedAt: new Date("2026-09-03T00:01:00.000Z"),
        },
      );
      await setDoc(doc(adminFirestore, "privateProfiles", "bob"), { displayName: "Bob" });
      await setDoc(doc(adminFirestore, "healthProfiles", "bob"), { conditions: ["asthma"] });
      await setDoc(doc(adminFirestore, "fitnessProfiles", "bob"), { experience: "BEGINNER" });
      await setDoc(doc(adminFirestore, "workoutSessions", "bob-solo-1"), {
        status: "ACTIVE",
        uid: "bob",
      });
    });

    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    // Nothing private about Bob leaks to Alice just because they train together.
    await assertFails(
      getDoc(
        doc(
          aliceFirestore,
          "groupSessions",
          "group-privacy",
          "participants",
          "bob",
          "sets",
          "set-1",
        ),
      ),
    );
    await assertFails(getDoc(doc(aliceFirestore, "privateProfiles", "bob")));
    await assertFails(getDoc(doc(aliceFirestore, "healthProfiles", "bob")));
    await assertFails(getDoc(doc(aliceFirestore, "fitnessProfiles", "bob")));
    await assertFails(getDoc(doc(aliceFirestore, "workoutSessions", "bob-solo-1")));

    // The shared snapshot stays visible: it carries no private data.
    await assertSucceeds(
      getDoc(doc(aliceFirestore, "groupSessions", "group-privacy", "participants", "bob")),
    );

    // Nobody closes someone else's participation from the client.
    await assertFails(
      updateDoc(doc(aliceFirestore, "groupSessions", "group-privacy", "participants", "bob"), {
        completedAt: serverTimestamp(),
        status: "COMPLETED",
      }),
    );
    await assertFails(
      updateDoc(doc(bobFirestore, "groupSessions", "group-privacy", "participants", "bob"), {
        completedAt: serverTimestamp(),
        status: "COMPLETED",
      }),
    );

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(context.firestore(), "groupSessions", "group-privacy", "participants", "bob"),
        {
          completedAt: new Date("2026-09-03T00:30:00.000Z"),
          operationalState: "PAUSED",
          operationalStateUpdatedAt: new Date("2026-09-03T00:30:00.000Z"),
          status: "COMPLETED",
        },
      );
    });

    // A finished participation is frozen: no new sets, no operational updates.
    await assertFails(
      setDoc(
        doc(bobFirestore, "groupSessions", "group-privacy", "participants", "bob", "sets", "set-2"),
        {
          completedAt: "2026-09-03T00:31:00.000Z",
          createdAt: serverTimestamp(),
          eventId: "set-2",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-privacy",
          id: "set-2",
          loadKg: 62.5,
          notes: null,
          reps: 8,
          rir: 1,
          setIndex: 2,
          uid: "bob",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertFails(
      updateDoc(doc(bobFirestore, "groupSessions", "group-privacy", "participants", "bob"), {
        operationalState: "PERFORMING_SET",
        operationalStateUpdatedAt: serverTimestamp(),
      }),
    );

    // Alice keeps training: her own set path is untouched by Bob's completion.
    await assertSucceeds(
      setDoc(
        doc(
          aliceFirestore,
          "groupSessions",
          "group-privacy",
          "participants",
          "alice",
          "sets",
          "set-9",
        ),
        {
          completedAt: "2026-09-03T00:32:00.000Z",
          createdAt: serverTimestamp(),
          eventId: "set-9",
          exerciseId: "bench-press",
          feedback: null,
          groupSessionId: "group-privacy",
          id: "set-9",
          loadKg: 80,
          notes: null,
          reps: 8,
          rir: 1,
          setIndex: 9,
          uid: "alice",
          updatedAt: serverTimestamp(),
        },
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(bobFirestore, "groupSessions", "group-privacy", "participants", "bob", "sets", "set-1"),
      ),
    );
  });

  it("keeps cardio sessions private to their owner and validated by shape", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    const cardio = {
      completedAt: null,
      createdAt: "2026-09-09T12:00:00.000Z",
      distanceMeters: null,
      durationSeconds: 0,
      id: "cardio-1",
      ownerUid: "alice",
      prescription: {
        intensity: "MODERATE",
        modality: "WALK",
        notes: null,
        requirement: "OPTIONAL",
        targetSeconds: 900,
      },
      rescheduledFor: null,
      skipReason: null,
      skippedAt: null,
      source: "STANDALONE",
      startedAt: "2026-09-09T12:00:00.000Z",
      status: "ACTIVE",
      updatedAt: serverTimestamp(),
      workoutSessionId: null,
    };

    await assertSucceeds(setDoc(doc(aliceFirestore, "cardioSessions", "cardio-1"), cardio));
    await assertSucceeds(getDoc(doc(aliceFirestore, "cardioSessions", "cardio-1")));
    await assertFails(getDoc(doc(bobFirestore, "cardioSessions", "cardio-1")));
    await assertFails(
      setDoc(doc(bobFirestore, "cardioSessions", "cardio-2"), { ...cardio, id: "cardio-2" }),
    );
    await assertFails(
      updateDoc(doc(bobFirestore, "cardioSessions", "cardio-1"), { status: "COMPLETED" }),
    );

    // Pular exige motivo explícito também nas Rules.
    await assertFails(
      setDoc(doc(aliceFirestore, "cardioSessions", "cardio-1"), {
        ...cardio,
        skipReason: null,
        skippedAt: "2026-09-09T12:10:00.000Z",
        status: "SKIPPED",
      }),
    );
    await assertSucceeds(
      setDoc(doc(aliceFirestore, "cardioSessions", "cardio-1"), {
        ...cardio,
        skipReason: "Dor no joelho",
        skippedAt: "2026-09-09T12:10:00.000Z",
        status: "SKIPPED",
      }),
    );
  });

  it("keeps food logs private to their owner and validates their snapshot", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    const entry = {
      consumedAt: "2026-09-09T12:00:00.000Z",
      createdAt: serverTimestamp(),
      food: {
        confidence: "ESTIMATED",
        foodId: "chicken-breast-grilled",
        foodName: "Peito de frango grelhado",
        servingLabel: "1 filé médio",
        sourceProvider: "INTERNAL",
      },
      id: "food-log-1",
      meal: "LUNCH",
      notes: null,
      nutrition: {
        carbohydratesGrams: 0,
        energyKcal: 198,
        fatGrams: 4.3,
        fiberGrams: null,
        proteinGrams: 37.2,
        sodiumMilligrams: 88.8,
      },
      ownerUid: "alice",
      portionGrams: 120,
      updatedAt: serverTimestamp(),
    };

    await assertSucceeds(
      setDoc(doc(aliceFirestore, "foodLogs", "alice", "entries", "food-log-1"), entry),
    );
    await assertSucceeds(getDoc(doc(aliceFirestore, "foodLogs", "alice", "entries", "food-log-1")));
    await assertFails(getDoc(doc(bobFirestore, "foodLogs", "alice", "entries", "food-log-1")));
    await assertFails(
      setDoc(doc(bobFirestore, "foodLogs", "alice", "entries", "food-log-2"), {
        ...entry,
        id: "food-log-2",
      }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "foodLogs", "alice", "entries", "food-log-invalid"), {
        ...entry,
        food: { ...entry.food, sourceProvider: "UNKNOWN" },
        id: "food-log-invalid",
      }),
    );
  });

  it("keeps body measurements owner-only and validated", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    const measurement = {
      armCm: null,
      bodyFatPercent: null,
      chestCm: null,
      createdAt: "2026-09-09T12:00:00.000Z",
      heightCm: 175,
      hipCm: null,
      id: "measurement-1",
      notes: null,
      ownerUid: "alice",
      takenAt: "2026-09-09T12:00:00.000Z",
      thighCm: null,
      updatedAt: serverTimestamp(),
      waistCm: 85,
      weightKg: 78,
    };

    await assertSucceeds(
      setDoc(doc(aliceFirestore, "measurements", "alice", "items", "measurement-1"), measurement),
    );
    await assertSucceeds(
      getDoc(doc(aliceFirestore, "measurements", "alice", "items", "measurement-1")),
    );
    await assertFails(getDoc(doc(bobFirestore, "measurements", "alice", "items", "measurement-1")));
    await assertFails(
      setDoc(doc(bobFirestore, "measurements", "alice", "items", "measurement-2"), {
        ...measurement,
        id: "measurement-2",
      }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "measurements", "alice", "items", "measurement-3"), {
        ...measurement,
        id: "measurement-3",
        weightKg: 900,
      }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "measurements", "alice", "items", "measurement-4"), {
        ...measurement,
        id: "measurement-4",
        sharedWithPartner: true,
      }),
    );
  });

  it("keeps deny-by-default for any collection that has no explicit rule", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();

    for (const collection of [
      "adminRoles",
      "auditLogs",
      "featureFlags",
      "processedEvents",
      "rateLimits",
      "subscriptionState",
      "colecaoQueNaoExiste",
    ]) {
      await assertFails(getDoc(doc(aliceFirestore, collection, "alice")));
      await assertFails(setDoc(doc(aliceFirestore, collection, "alice"), { hacked: true }));
    }

    // Nem mesmo o dono escreve na própria projeção semanal.
    await assertFails(
      setDoc(doc(aliceFirestore, "weeklyStats", "alice", "weeks", "2026-09-07"), {
        completedWorkouts: 99,
      }),
    );
  });

  it("exposes training invites only to the sender and receiver, never to the client for writes", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "trainingInvites", "invite-1"), {
        cancelledAt: null,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        expiresAt: "2026-09-04T00:00:00.000Z",
        groupSessionId: null,
        id: "invite-1",
        receiverAvatar: null,
        receiverDisplayName: "Bob",
        receiverPublicUserId: "WT-AAAA-BBBB",
        receiverUid: "bob",
        respondedAt: null,
        senderAvatar: null,
        senderDisplayName: "Alice",
        senderPublicUserId: "WT-7FK3-Q9LP",
        senderUid: "alice",
        status: "PENDING",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      });
    });

    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();
    const charlieFirestore = testEnvironment.authenticatedContext("charlie").firestore();

    await assertSucceeds(getDoc(doc(aliceFirestore, "trainingInvites", "invite-1")));
    await assertSucceeds(getDoc(doc(bobFirestore, "trainingInvites", "invite-1")));
    await assertFails(getDoc(doc(charlieFirestore, "trainingInvites", "invite-1")));
    await assertFails(
      updateDoc(doc(bobFirestore, "trainingInvites", "invite-1"), { status: "ACCEPTED" }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "trainingInvites", "invite-2"), {
        receiverUid: "bob",
        senderUid: "alice",
        status: "PENDING",
      }),
    );
  });

  it("lets a user manage only their own block list", async () => {
    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceFirestore, "blockedUsers", "alice", "blocked", "bob"), {
        blockedUid: "bob",
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "blockedUsers", "alice", "blocked", "carol"), {
        blockedUid: "bob",
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
    );
    await assertFails(getDoc(doc(bobFirestore, "blockedUsers", "alice", "blocked", "bob")));
    await assertSucceeds(getDoc(doc(aliceFirestore, "blockedUsers", "alice", "blocked", "bob")));
  });

  it("lets a user read their notifications and only toggle the read marker", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "notifications", "alice", "items", "note-1"), {
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        inviteId: "invite-1",
        readAt: null,
        senderDisplayName: "Bob",
        senderPublicUserId: "WT-AAAA-BBBB",
        type: "TRAINING_INVITE_RECEIVED",
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      });
    });

    const aliceFirestore = testEnvironment.authenticatedContext("alice").firestore();
    const bobFirestore = testEnvironment.authenticatedContext("bob").firestore();

    await assertSucceeds(getDoc(doc(aliceFirestore, "notifications", "alice", "items", "note-1")));
    await assertFails(getDoc(doc(bobFirestore, "notifications", "alice", "items", "note-1")));
    await assertSucceeds(
      updateDoc(doc(aliceFirestore, "notifications", "alice", "items", "note-1"), {
        readAt: new Date("2026-09-02T01:00:00.000Z"),
        updatedAt: new Date("2026-09-02T01:00:00.000Z"),
      }),
    );
    await assertFails(
      updateDoc(doc(aliceFirestore, "notifications", "alice", "items", "note-1"), {
        type: "SOMETHING_ELSE",
      }),
    );
    await assertFails(
      setDoc(doc(aliceFirestore, "notifications", "alice", "items", "note-2"), {
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        readAt: null,
        type: "TRAINING_INVITE_RECEIVED",
      }),
    );
  });
});
