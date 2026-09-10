// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CopyPublicUserIdButton } from "./copy-public-user-id-button";

describe("CopyPublicUserIdButton", () => {
  it("copies the public id and announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyPublicUserIdButton publicUserId="WT-7FK3-Q9LP" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar ID" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("WT-7FK3-Q9LP");
      expect(screen.getByRole("alert").textContent).toContain("WillTreino ID copiado.");
    });
  });
});
