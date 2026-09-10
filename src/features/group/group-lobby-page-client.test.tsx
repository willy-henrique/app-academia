// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  activateGroupSessionRequest,
  completeGroupParticipationRequest,
  flushPendingGroupParticipantSetSyncs,
  getPendingGroupParticipantSetSyncCount,
  subscribeToGroupConnectionState,
  saveGroupLobbyConfiguration,
  leaveGroupSessionRequest,
  setGroupParticipantOperationalState,
  setGroupLobbyReady,
  startGroupSessionRequest,
  subscribeToGroupLobby,
  useAuthSession,
} = vi.hoisted(() => ({
  activateGroupSessionRequest: vi.fn(),
  completeGroupParticipationRequest: vi.fn(),
  flushPendingGroupParticipantSetSyncs: vi.fn(),
  getPendingGroupParticipantSetSyncCount: vi.fn(),
  subscribeToGroupConnectionState: vi.fn(),
  saveGroupLobbyConfiguration: vi.fn(),
  leaveGroupSessionRequest: vi.fn(),
  setGroupParticipantOperationalState: vi.fn(),
  setGroupLobbyReady: vi.fn(),
  startGroupSessionRequest: vi.fn(),
  subscribeToGroupLobby: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

vi.mock("./group-offline-sync", () => ({
  flushPendingGroupParticipantSetSyncs,
  getPendingGroupParticipantSetSyncCount,
  subscribeToGroupConnectionState,
}));

vi.mock("./group-lobby-repository", () => ({
  activateGroupSessionRequest,
  completeGroupParticipationRequest,
  saveGroupLobbyConfiguration,
  leaveGroupSessionRequest,
  setGroupParticipantOperationalState,
  setGroupLobbyReady,
  startGroupSessionRequest,
  subscribeToGroupLobby,
}));

import { GroupLobbyPageClient } from "./group-lobby-page-client";

describe("GroupLobbyPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPendingGroupParticipantSetSyncCount.mockReturnValue(0);
    subscribeToGroupConnectionState.mockReturnValue(() => undefined);
    flushPendingGroupParticipantSetSyncs.mockResolvedValue({ pendingCount: 0, syncedCount: 0 });
  });

  it("shows only public participant snapshots and lets the host configure and ready up", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    subscribeToGroupLobby.mockImplementation((_sessionId, onChange) => {
      onChange({
        participants: [
          {
            completedAt: null,
            displaySnapshot: {
              avatar: null,
              displayName: "Alice",
              publicUserId: "WT-AAAA-BBBB",
            },
            joinedAt: "2026-09-03T00:00:00.000Z",
            leftAt: null,
            readyAt: null,
            role: "HOST",
            status: "INVITED",
            uid: "alice",
          },
          {
            completedAt: null,
            displaySnapshot: {
              avatar: null,
              displayName: "João",
              publicUserId: "WT-CCCC-DDDD",
            },
            joinedAt: "2026-09-03T00:00:00.000Z",
            leftAt: null,
            readyAt: "2026-09-03T00:01:00.000Z",
            role: "MEMBER",
            status: "READY",
            uid: "joao",
          },
        ],
        session: {
          hostUid: "alice",
          sharedEquipmentMode: "FULL",
          stationMode: "ROTATION_SHARED_STATION",
          status: "LOBBY",
          weightChangeMode: "NORMAL",
          weightChangeSeconds: null,
          workoutPlanId: "plan-1",
          workoutPlanVersionId: "version-1",
        },
      });
      return vi.fn();
    });
    setGroupLobbyReady.mockResolvedValue(undefined);
    saveGroupLobbyConfiguration.mockResolvedValue(undefined);
    startGroupSessionRequest.mockResolvedValue({
      countdownSeconds: 5,
      sessionId: "group-1",
      startAt: "2026-09-03T00:00:05.000Z",
      status: "COUNTDOWN",
    });

    render(<GroupLobbyPageClient sessionId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    expect(screen.getByText("João")).toBeTruthy();
    expect(screen.queryByText("alice")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Estou pronto" }));
    await waitFor(() => {
      expect(setGroupLobbyReady).toHaveBeenCalledWith("group-1", "alice", true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
    await waitFor(() => {
      expect(saveGroupLobbyConfiguration).toHaveBeenCalledWith(
        "group-1",
        expect.objectContaining({
          sharedEquipmentMode: "FULL",
          stationMode: "ROTATION_SHARED_STATION",
          weightChangeMode: "NORMAL",
        }),
      );
    });
  });

  it("shows only operational partner status during an active workout", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    subscribeToGroupLobby.mockImplementation((_sessionId, onChange) => {
      onChange({
        participants: [
          {
            completedAt: null,
            displaySnapshot: {
              avatar: null,
              displayName: "Alice",
              publicUserId: "WT-AAAA-BBBB",
            },
            joinedAt: "2026-09-03T00:00:00.000Z",
            leftAt: null,
            operationalState: "WAITING_TURN",
            operationalStateUpdatedAt: "2026-09-03T00:01:00.000Z",
            readyAt: "2026-09-03T00:01:00.000Z",
            role: "HOST",
            status: "ACTIVE",
            uid: "alice",
          },
          {
            completedAt: null,
            displaySnapshot: {
              avatar: null,
              displayName: "João",
              publicUserId: "WT-CCCC-DDDD",
            },
            joinedAt: "2026-09-03T00:00:00.000Z",
            leftAt: null,
            operationalState: "RESTING",
            operationalStateUpdatedAt: "2026-09-03T00:01:00.000Z",
            readyAt: "2026-09-03T00:01:00.000Z",
            role: "MEMBER",
            status: "ACTIVE",
            uid: "joao-private-uid",
          },
        ],
        session: {
          hostUid: "alice",
          sharedEquipmentMode: "FULL",
          startAt: "2026-09-03T00:00:00.000Z",
          stationMode: "ROTATION_SHARED_STATION",
          status: "ACTIVE",
          weightChangeMode: "NORMAL",
          weightChangeSeconds: null,
          workoutPlanId: "plan-1",
          workoutPlanVersionId: "version-1",
        },
      });
      return vi.fn();
    });
    setGroupParticipantOperationalState.mockResolvedValue(undefined);
    leaveGroupSessionRequest.mockResolvedValue(undefined);

    render(<GroupLobbyPageClient sessionId="group-1" />);

    await waitFor(() => {
      expect(screen.getByText("João")).toBeTruthy();
    });
    expect(screen.getByText(/Descansando/)).toBeTruthy();
    expect(screen.queryByText("joao-private-uid")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Estou executando" }));
    await waitFor(() => {
      expect(setGroupParticipantOperationalState).toHaveBeenCalledWith("group-1", "PERFORMING_SET");
    });

    fireEvent.click(screen.getByRole("button", { name: "Sair deste treino" }));
    await waitFor(() => {
      expect(leaveGroupSessionRequest).toHaveBeenCalledWith("group-1");
    });
  });
  it("keeps offline sets visible and flushes them once the connection returns", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    subscribeToGroupLobby.mockImplementation((_sessionId, onChange) => {
      onChange({
        participants: [
          {
            completedAt: null,
            displaySnapshot: {
              avatar: null,
              displayName: "Alice",
              publicUserId: "WT-AAAA-BBBB",
            },
            joinedAt: "2026-09-03T00:00:00.000Z",
            leftAt: null,
            operationalState: "PERFORMING_SET",
            operationalStateUpdatedAt: "2026-09-03T00:01:00.000Z",
            readyAt: "2026-09-03T00:01:00.000Z",
            role: "HOST",
            status: "ACTIVE",
            uid: "alice",
          },
        ],
        session: {
          hostUid: "alice",
          sharedEquipmentMode: "FULL",
          startAt: "2026-09-03T00:00:00.000Z",
          stationMode: "ROTATION_SHARED_STATION",
          status: "ACTIVE",
          weightChangeMode: "NORMAL",
          weightChangeSeconds: null,
          workoutPlanId: "plan-1",
          workoutPlanVersionId: "version-1",
        },
      });
      return vi.fn();
    });

    let emitConnectionState: ((state: string) => void) | null = null;
    subscribeToGroupConnectionState.mockImplementation((onChange: (state: string) => void) => {
      emitConnectionState = onChange;
      return () => undefined;
    });
    getPendingGroupParticipantSetSyncCount.mockReturnValue(2);
    flushPendingGroupParticipantSetSyncs.mockResolvedValue({ pendingCount: 0, syncedCount: 2 });

    render(<GroupLobbyPageClient sessionId="group-1" />);

    await waitFor(() => {
      expect(emitConnectionState).not.toBeNull();
    });

    act(() => {
      emitConnectionState?.("OFFLINE");
    });
    await waitFor(() => {
      expect(screen.getByText(/offline · 2 série\(s\) guardada\(s\) neste aparelho/)).toBeTruthy();
    });

    act(() => {
      emitConnectionState?.("RECONNECTING");
    });

    await waitFor(() => {
      expect(flushPendingGroupParticipantSetSyncs).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText("2 evento(s) locais sincronizado(s).")).toBeTruthy();
    });
    expect(screen.queryByText(/guardada\(s\) neste aparelho/)).toBeNull();
  });
  it("closes only the caller's participation and keeps the group session running", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    const participants = [
      {
        completedAt: null,
        displaySnapshot: {
          avatar: null,
          displayName: "Alice",
          publicUserId: "WT-AAAA-BBBB",
        },
        joinedAt: "2026-09-03T00:00:00.000Z",
        leftAt: null,
        operationalState: "PERFORMING_SET",
        operationalStateUpdatedAt: "2026-09-03T00:01:00.000Z",
        readyAt: "2026-09-03T00:01:00.000Z",
        role: "HOST",
        status: "ACTIVE",
        uid: "alice",
      },
      {
        completedAt: null,
        displaySnapshot: {
          avatar: null,
          displayName: "João",
          publicUserId: "WT-CCCC-DDDD",
        },
        joinedAt: "2026-09-03T00:00:00.000Z",
        leftAt: null,
        operationalState: "RESTING",
        operationalStateUpdatedAt: "2026-09-03T00:01:00.000Z",
        readyAt: "2026-09-03T00:01:00.000Z",
        role: "MEMBER",
        status: "ACTIVE",
        uid: "joao-private-uid",
      },
    ];
    let publish: ((snapshot: unknown) => void) | null = null;
    subscribeToGroupLobby.mockImplementation((_sessionId, onChange) => {
      publish = onChange;
      onChange({
        participants,
        session: {
          hostUid: "alice",
          sharedEquipmentMode: "FULL",
          startAt: "2026-09-03T00:00:00.000Z",
          stationMode: "ROTATION_SHARED_STATION",
          status: "ACTIVE",
          weightChangeMode: "NORMAL",
          weightChangeSeconds: null,
          workoutPlanId: "plan-1",
          workoutPlanVersionId: "version-1",
        },
      });
      return vi.fn();
    });
    completeGroupParticipationRequest.mockResolvedValue({
      participantStatus: "COMPLETED",
      sessionId: "group-1",
      sessionStatus: "ACTIVE",
    });

    render(<GroupLobbyPageClient sessionId="group-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir meu treino" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Concluir meu treino" }));
    await waitFor(() => {
      expect(completeGroupParticipationRequest).toHaveBeenCalledWith("group-1");
    });
    await waitFor(() => {
      expect(
        screen.getByText("Treino concluído. Seu histórico foi preservado e o grupo continua."),
      ).toBeTruthy();
    });

    act(() => {
      publish?.({
        participants: [
          { ...participants[0], completedAt: "2026-09-03T00:30:00.000Z", status: "COMPLETED" },
          participants[1],
        ],
        session: {
          hostUid: "alice",
          sharedEquipmentMode: "FULL",
          startAt: "2026-09-03T00:00:00.000Z",
          stationMode: "ROTATION_SHARED_STATION",
          status: "ACTIVE",
          weightChangeMode: "NORMAL",
          weightChangeSeconds: null,
          workoutPlanId: "plan-1",
          workoutPlanVersionId: "version-1",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Você concluiu este treino")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Concluir meu treino" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sair deste treino" })).toBeNull();
    expect(screen.getByText("João")).toBeTruthy();
  });
});
