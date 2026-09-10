// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OptionCards } from "./option-cards";

const options = [
  { description: "Volume e hipertrofia.", label: "Ganhar massa muscular", value: "ganhar_massa" },
  { label: "Perder peso", value: "perder_peso" },
] as const;

describe("OptionCards", () => {
  it("exposes the choices as a real radio group", () => {
    render(<OptionCards label="Objetivo principal" name="goal" options={options} />);

    expect(screen.getByRole("radiogroup", { name: "Objetivo principal" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("keeps the stored value while showing the human label", () => {
    render(<OptionCards label="Objetivo" name="goal" options={options} />);

    const radio = screen.getByRole("radio", { name: /Ganhar massa muscular/ }) as HTMLInputElement;

    expect(radio.value).toBe("ganhar_massa");
  });

  it("marks the current answer as checked", () => {
    render(
      <OptionCards
        label="Objetivo"
        name="goal"
        onChange={() => {}}
        options={options}
        value="perder_peso"
      />,
    );

    expect((screen.getByRole("radio", { name: "Perder peso" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("reports the chosen value through onChange", () => {
    const onChange = vi.fn();
    render(<OptionCards label="Objetivo" name="goal" onChange={onChange} options={options} />);

    fireEvent.click(screen.getByRole("radio", { name: "Perder peso" }));

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].target.value).toBe("perder_peso");
  });

  it("ties hint and error to the group for screen readers", () => {
    render(
      <OptionCards
        error="Escolha um objetivo."
        hint="Dá para mudar depois."
        label="Objetivo"
        name="goal"
        options={options}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Objetivo" });
    const describedBy = group.getAttribute("aria-describedby") ?? "";

    expect(describedBy).toContain("-hint");
    expect(describedBy).toContain("-error");
    expect(screen.getByRole("alert").textContent).toContain("Escolha um objetivo.");
  });
});
