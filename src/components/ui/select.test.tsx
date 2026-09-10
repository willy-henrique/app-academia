// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Select } from "./select";

const goals = [
  { label: "Ganhar massa muscular", value: "ganhar_massa" },
  { label: "Perder peso", value: "perder_peso" },
] as const;

describe("Select", () => {
  it("associates the visible label with the control", () => {
    render(<Select label="Objetivo principal" options={goals} />);

    expect(screen.getByLabelText("Objetivo principal").tagName).toBe("SELECT");
  });

  it("shows human labels while keeping the stored values", () => {
    render(<Select label="Objetivo principal" options={goals} />);

    const option = screen.getByRole("option", { name: "Ganhar massa muscular" });

    expect((option as HTMLOptionElement).value).toBe("ganhar_massa");
    // Regressão: os selects despejavam o enum cru ("ganhar_massa") na tela.
    expect(screen.queryByRole("option", { name: "ganhar_massa" })).toBeNull();
  });

  it("renders a placeholder option that cannot be chosen as an answer", () => {
    render(<Select label="Objetivo" options={goals} placeholder="Selecione um objetivo" />);

    const placeholder = screen.getByRole("option", {
      name: "Selecione um objetivo",
    }) as HTMLOptionElement;

    expect(placeholder.value).toBe("");
    expect(placeholder.disabled).toBe(true);
  });

  it("ties hint and error to the control for screen readers", () => {
    render(
      <Select
        error="Escolha um objetivo."
        hint="Dá para mudar depois."
        label="Objetivo"
        options={goals}
      />,
    );

    const select = screen.getByLabelText("Objetivo");
    const describedBy = select.getAttribute("aria-describedby") ?? "";

    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(describedBy).toContain("-hint");
    expect(describedBy).toContain("-error");
    expect(screen.getByRole("alert").textContent).toContain("Escolha um objetivo.");
  });
});
