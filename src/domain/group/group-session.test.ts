import { describe, expect, it } from "vitest";

import {
  configureGroupLobby,
  createGroupSessionFromInvite,
  estimateGroupLobbyDurationSeconds,
  resolveEquipmentTransitionSeconds,
  setGroupParticipantReady,
  startGroupSession,
} from "./group-session";
import { createTrainingInvite } from "./training-invite";

const now = new Date("2026-09-02T12:00:00.000Z");

const invite = createTrainingInvite(
  {
    id: "invite-1",
    receiverDisplayName: "João",
    receiverPublicUserId: "WT-AAAA-BBBB",
    receiverUid: "joao",
    senderDisplayName: "Willy",
    senderPublicUserId: "WT-7FK3-Q9LP",
    senderUid: "willy",
    workoutPlanId: "plan-1",
    workoutPlanVersionId: "version-1",
  },
  now,
);

describe("createGroupSessionFromInvite", () => {
  it("creates one shared lobby session hosted by the sender", () => {
    const { session } = createGroupSessionFromInvite(invite, now);

    expect(session.status).toBe("LOBBY");
    expect(session.hostUid).toBe("willy");
    expect(session.workoutPlanId).toBe("plan-1");
    expect(session.workoutPlanVersionId).toBe("version-1");
    expect(session.sharedEquipmentMode).toBe("UNSET");
    expect(session.weightChangeMode).toBe("UNSET");
    expect(session.weightChangeSeconds).toBeNull();
  });

  it("adds the sender as HOST and the receiver as a READY MEMBER", () => {
    const { participants } = createGroupSessionFromInvite(invite, now);

    const host = participants.find((participant) => participant.uid === "willy");
    const member = participants.find((participant) => participant.uid === "joao");

    expect(host?.role).toBe("HOST");
    expect(member?.role).toBe("MEMBER");
    expect(member?.status).toBe("READY");
    expect(member?.operationalState).toBe("WAITING_TURN");
    expect(host?.displaySnapshot.displayName).toBe("Willy");
  });

  it("lets only the host configure the lobby and validates custom load changes", () => {
    const { session } = createGroupSessionFromInvite(invite, now);

    expect(() =>
      configureGroupLobby(session, "joao", {
        sharedEquipmentMode: "FULL",
        stationMode: "ROTATION_SHARED_STATION",
        weightChangeMode: "NORMAL",
      }),
    ).toThrow(/host/i);

    const configured = configureGroupLobby(session, "willy", {
      sharedEquipmentMode: "FULL",
      stationMode: "ROTATION_SHARED_STATION",
      weightChangeMode: "CUSTOM",
      weightChangeSeconds: 35,
    });

    expect(configured.weightChangeSeconds).toBe(35);
  });

  it("records ready state and estimates a group duration without multiplying solo time", () => {
    const { participants } = createGroupSessionFromInvite(invite, now);
    const host = participants[0];
    const readyHost = setGroupParticipantReady(host, true, now);

    expect(readyHost.status).toBe("READY");
    expect(readyHost.readyAt).toBe(now.toISOString());
    expect(
      estimateGroupLobbyDurationSeconds(3, "ROTATION_SHARED_STATION", 20, 45 * 60),
    ).toBeLessThan(45 * 60 * 3);
  });

  it("adds station transitions only when equipment is actually shared", () => {
    const noSharedEquipment = estimateGroupLobbyDurationSeconds(
      3,
      "ROTATION_SHARED_STATION",
      20,
      45 * 60,
      resolveEquipmentTransitionSeconds("NONE", "ROTATION_SHARED_STATION"),
    );
    const sharedStation = estimateGroupLobbyDurationSeconds(
      3,
      "ROTATION_SHARED_STATION",
      20,
      45 * 60,
      resolveEquipmentTransitionSeconds("FULL", "ROTATION_SHARED_STATION"),
    );

    expect(resolveEquipmentTransitionSeconds("FULL", "ROTATION_SHARED_STATION")).toBe(15);
    expect(resolveEquipmentTransitionSeconds("NONE", "ROTATION_SHARED_STATION")).toBe(0);
    expect(sharedStation).toBeGreaterThan(noSharedEquipment);
  });

  it("starts once with an authoritative future timestamp only after everyone is ready", () => {
    const { participants, session } = createGroupSessionFromInvite(invite, now);
    const readyParticipants = participants.map((participant) =>
      setGroupParticipantReady(participant, true, now),
    );
    const started = startGroupSession(session, "willy", readyParticipants, now, 5);

    expect(started.status).toBe("COUNTDOWN");
    expect(started.startAt).toBe("2026-09-02T12:00:05.000Z");
    expect(startGroupSession(started, "willy", readyParticipants, now, 5)).toBe(started);
    expect(() => startGroupSession(session, "willy", participants, now, 5)).toThrow(/prontos/i);
  });
});
