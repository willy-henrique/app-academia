// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findActiveCardioSession,
  listCardioSessions,
  recordCardioCompletionRequest,
  saveCardioSession,
  useAuthSession,
} = vi.hoisted(() => ({
  findActiveCardioSession: vi.fn(),
  listCardioSessions: vi.fn(),
  recordCardioCompletionRequest: vi.fn(),
  saveCardioSession: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

vi.mock("./cardio-repository", () => ({
  findActiveCardioSession,
  listCardioSessions,
  persistActiveCardioLocal: vi.fn(),
  recordCardioCompletionRequest,
  saveCardioSession,
}));

import { CardioPageClient } from "./cardio-page-client";

describe("CardioPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({ status: "authenticated", user: { uid: "alice" } });
    findActiveCardioSession.mockResolvedValue(null);
    listCardioSessions.mockResolvedValue([]);
    saveCardioSession.mockImplementation(async (session: unknown) => session);
    recordCardioCompletionRequest.mockResolvedValue({
      cardioSessionId: "cardio-1",
      credited: true,
      weekKey: "2026-09-07",
    });
  });

  it("starts and finishes an independent cardio session", async () => {
    render(<CardioPageClient />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar cardio" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir cardio" })).toBeTruthy();
    });
    expect(saveCardioSession).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUid: "alice", source: "STANDALONE", status: "ACTIVE" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Concluir cardio" }));
    await waitFor(() => {
      expect(recordCardioCompletionRequest).toHaveBeenCalled();
    });
    expect(screen.getByText("Cardio concluído e somado à sua semana.")).toBeTruthy();
    expect(saveCardioSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ durationSeconds: 900, status: "COMPLETED" }),
    );
  });

  it("resumes an active cardio session after page reload", async () => {
    findActiveCardioSession.mockResolvedValue({
      id: "cardio-active-saved",
      ownerUid: "alice",
      prescription: { modality: "RUN", requirement: "OPTIONAL", targetSeconds: 1200 },
      source: "STANDALONE",
      startedAt: new Date(Date.now() - 300000).toISOString(),
      status: "ACTIVE",
    });

    render(<CardioPageClient />);

    await waitFor(() => {
      expect(screen.getByText("Cardio em andamento recuperado.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Concluir cardio" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Concluir cardio" }));
    await waitFor(() => {
      expect(recordCardioCompletionRequest).toHaveBeenCalledWith("cardio-active-saved");
    });
    expect(saveCardioSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "cardio-active-saved", status: "COMPLETED" }),
    );
  });

  it("requires a reason to skip and keeps the strength session untouched", async () => {
    render(<CardioPageClient />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar cardio" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pular cardio" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pular cardio" }));
    await waitFor(() => {
      expect(screen.getByText("Informe o motivo para pular o cardio.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Motivo para pular"), {
      target: { value: "Dor no joelho" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pular cardio" }));

    await waitFor(() => {
      expect(saveCardioSession).toHaveBeenLastCalledWith(
        expect.objectContaining({ skipReason: "Dor no joelho", status: "SKIPPED" }),
      );
    });
    expect(screen.getByText(/treino de força continua concluído/)).toBeTruthy();
    expect(recordCardioCompletionRequest).not.toHaveBeenCalled();
  });

  it("reschedules a pending cardio without completing it", async () => {
    render(<CardioPageClient />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar cardio" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reagendar para amanhã" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reagendar para amanhã" }));
    await waitFor(() => {
      expect(saveCardioSession).toHaveBeenLastCalledWith(
        expect.objectContaining({ completedAt: null, status: "RESCHEDULED" }),
      );
    });
    expect(screen.getByText(/continua pendente, não concluído/)).toBeTruthy();
  });
});
