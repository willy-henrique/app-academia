// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GoogleLinkButton } from "./google-link-button";
import { GoogleLinkRequiresRecentLoginError } from "./google-link";

describe("GoogleLinkButton", () => {
  it("announces a successful link", async () => {
    const linkAccount = vi.fn().mockResolvedValue("POPUP_COMPLETED");

    render(<GoogleLinkButton linkAccount={linkAccount} />);

    fireEvent.click(screen.getByRole("button", { name: "Vincular Google" }));

    await waitFor(() => {
      expect(linkAccount).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert").textContent).toContain("Google vinculada à sua conta.");
    });
  });

  it("guides the user to reauthenticate when required", async () => {
    const linkAccount = vi.fn().mockRejectedValue(new GoogleLinkRequiresRecentLoginError());

    render(<GoogleLinkButton linkAccount={linkAccount} />);

    fireEvent.click(screen.getByRole("button", { name: "Vincular Google" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Reautentique-se");
    });
  });
});
