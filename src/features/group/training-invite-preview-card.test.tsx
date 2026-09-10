// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrainingInvitePreviewCard } from "./training-invite-preview-card";

describe("TrainingInvitePreviewCard", () => {
  it("shows only the minimal public preview", () => {
    render(
      <TrainingInvitePreviewCard
        preview={{
          accountState: "ACTIVE",
          avatar: null,
          displayName: "João",
          publicUserId: "WT-AAAA-BBBB",
        }}
      />,
    );

    expect(screen.getByText("João")).toBeTruthy();
    expect(screen.getByText("WT-AAAA-BBBB")).toBeTruthy();
    expect(screen.getByText("Ativa")).toBeTruthy();
    expect(screen.queryByText(/uid/i)).toBeNull();
  });

  it("renders provided actions", () => {
    render(
      <TrainingInvitePreviewCard
        preview={{
          accountState: "ACTIVE",
          avatar: null,
          displayName: "João",
          publicUserId: "WT-AAAA-BBBB",
        }}
        actions={<button type="button">Convidar</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Convidar" })).toBeTruthy();
  });
});
