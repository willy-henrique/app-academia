// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMeasurements, saveMeasurement, uploadProgressPhoto, useAuthSession } = vi.hoisted(
  () => ({
    listMeasurements: vi.fn(),
    saveMeasurement: vi.fn(),
    uploadProgressPhoto: vi.fn(),
    useAuthSession: vi.fn(),
  }),
);

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

vi.mock("./measurements-repository", () => ({
  listMeasurements,
  saveMeasurement,
  uploadProgressPhoto,
}));

import { MeasurementsPanel } from "./measurements-panel";

describe("MeasurementsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({ status: "authenticated", user: { uid: "alice" } });
    listMeasurements.mockResolvedValue([]);
    saveMeasurement.mockImplementation(async (measurement: unknown) => measurement);
    uploadProgressPhoto.mockResolvedValue({ path: "progress/alice/1.png", url: "https://x" });
  });

  it("records a private measurement and shows the derived BMI", async () => {
    render(<MeasurementsPanel />);

    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "78" } });
    fireEvent.change(screen.getByLabelText("Altura (cm)"), { target: { value: "175" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar medida" }));

    await waitFor(() => {
      expect(saveMeasurement).toHaveBeenCalledWith(
        expect.objectContaining({ heightCm: 175, ownerUid: "alice", weightKg: 78 }),
      );
    });
    expect(screen.getByText(/IMC 25.5/)).toBeTruthy();
    expect(screen.getByText("Medida registrada de forma privada.")).toBeTruthy();
  });

  it("keeps invalid values out of the history", async () => {
    render(<MeasurementsPanel />);

    fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar medida" }));

    await waitFor(() => {
      expect(screen.getByText(/Revise os valores/)).toBeTruthy();
    });
    expect(saveMeasurement).not.toHaveBeenCalled();
  });

  it("uploads a progress photo to the private folder", async () => {
    render(<MeasurementsPanel />);

    const file = new File(["image"], "progress.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Foto de progresso (privada)"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadProgressPhoto).toHaveBeenCalledWith(file);
    });
    expect(screen.getByText("Foto de progresso enviada para a sua pasta privada.")).toBeTruthy();
  });
});
