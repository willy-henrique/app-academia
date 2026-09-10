// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolvePublicUserId, sendTrainingInviteRequest } = vi.hoisted(() => ({
  resolvePublicUserId: vi.fn(),
  sendTrainingInviteRequest: vi.fn(),
}));

vi.mock("@/features/identity/resolve-public-user-id", () => ({ resolvePublicUserId }));
vi.mock("./training-invite-repository", () => ({ sendTrainingInviteRequest }));

import { SendTrainingInvitePanel } from "./send-training-invite-panel";

describe("SendTrainingInvitePanel", () => {
  beforeEach(() => {
    resolvePublicUserId.mockReset();
    sendTrainingInviteRequest.mockReset();
  });

  it("resolves a partner preview then sends an invite for the current plan", async () => {
    resolvePublicUserId.mockResolvedValue({
      accountState: "ACTIVE",
      avatar: null,
      displayName: "João",
      publicUserId: "WT-AAAA-BBBB",
    });
    sendTrainingInviteRequest.mockResolvedValue({
      expiresAt: "2026-09-04T12:00:00.000Z",
      inviteId: "invite-1",
      status: "PENDING",
    });

    render(<SendTrainingInvitePanel workoutPlanId="plan-1" workoutPlanVersionId="version-1" />);

    fireEvent.change(screen.getByLabelText("WillTreino ID"), { target: { value: "wtaaaabbbb" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar parceiro" }));

    await waitFor(() => expect(screen.getByText("Parceiro encontrado")).toBeTruthy());
    expect(resolvePublicUserId).toHaveBeenCalledWith({ publicUserId: "WT-AAAA-BBBB" });

    fireEvent.click(screen.getByRole("button", { name: "Convidar para este treino" }));

    await waitFor(() => expect(sendTrainingInviteRequest).toHaveBeenCalled());
    expect(screen.getAllByText(/Convite enviado para João/).length).toBeGreaterThan(0);
    expect(sendTrainingInviteRequest).toHaveBeenCalledWith({
      receiverPublicUserId: "WT-AAAA-BBBB",
      workoutPlanId: "plan-1",
      workoutPlanVersionId: "version-1",
    });
  });

  it("surfaces a recoverable error when the id cannot be resolved", async () => {
    resolvePublicUserId.mockRejectedValue(new Error("not-found"));

    render(<SendTrainingInvitePanel workoutPlanId="plan-1" workoutPlanVersionId="version-1" />);

    fireEvent.change(screen.getByLabelText("WillTreino ID"), { target: { value: "WT-ZZZZ-ZZZZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar parceiro" }));

    await waitFor(() =>
      expect(screen.getAllByText(/Não encontramos esse WillTreino ID/).length).toBeGreaterThan(0),
    );
    expect(sendTrainingInviteRequest).not.toHaveBeenCalled();
  });
});
