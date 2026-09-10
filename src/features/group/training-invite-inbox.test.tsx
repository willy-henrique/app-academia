// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { respondToTrainingInviteRequest, subscribeToIncomingTrainingInvites } = vi.hoisted(() => ({
  respondToTrainingInviteRequest: vi.fn(),
  subscribeToIncomingTrainingInvites: vi.fn(),
}));

vi.mock("./training-invite-repository", () => ({
  respondToTrainingInviteRequest,
  subscribeToIncomingTrainingInvites,
}));

import { createTrainingInvite } from "@/domain/group/training-invite";

import { TrainingInviteInbox } from "./training-invite-inbox";

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

describe("TrainingInviteInbox", () => {
  beforeEach(() => {
    respondToTrainingInviteRequest.mockReset();
    subscribeToIncomingTrainingInvites.mockReset();
  });

  it("lists pending invites from the live subscription", () => {
    const unsubscribe = vi.fn();
    subscribeToIncomingTrainingInvites.mockImplementation((_uid, onChange) => {
      onChange([invite]);
      return unsubscribe;
    });

    render(<TrainingInviteInbox uid="joao" />);

    expect(screen.getByText("Willy")).toBeTruthy();
    expect(screen.getByText(/WillTreino ID WT-7FK3-Q9LP/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aceitar" })).toBeTruthy();
  });

  it("accepts an invite and reports the created group session", async () => {
    subscribeToIncomingTrainingInvites.mockImplementation((_uid, onChange) => {
      onChange([invite]);
      return vi.fn();
    });
    respondToTrainingInviteRequest.mockResolvedValue({
      groupSessionId: "group-9",
      inviteId: "invite-1",
      status: "ACCEPTED",
    });
    const onAccepted = vi.fn();

    render(<TrainingInviteInbox uid="joao" onAccepted={onAccepted} />);
    fireEvent.click(screen.getByRole("button", { name: "Aceitar" }));

    await waitFor(() => expect(onAccepted).toHaveBeenCalledWith("group-9"));
    expect(respondToTrainingInviteRequest).toHaveBeenCalledWith("invite-1", "ACCEPT");
    expect(screen.queryByText("Willy")).toBeNull();
  });

  it("shows an empty state when there are no invites", () => {
    subscribeToIncomingTrainingInvites.mockImplementation((_uid, onChange) => {
      onChange([]);
      return vi.fn();
    });

    render(<TrainingInviteInbox uid="joao" />);
    expect(screen.getAllByText("Nenhum convite pendente.").length).toBeGreaterThan(0);
  });
});
