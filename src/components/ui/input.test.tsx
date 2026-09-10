// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("associates its label and hint with the native input", () => {
    render(<Input hint="Use seu e-mail principal" label="E-mail" type="email" />);

    const input = screen.getByLabelText("E-mail");
    expect(input.getAttribute("aria-describedby")).toContain("-hint");
    expect(screen.getByText("Use seu e-mail principal")).toBeTruthy();
  });

  it("announces validation errors", () => {
    render(<Input error="Informe um e-mail válido" label="E-mail" required type="email" />);

    const input = screen.getByLabelText("E-mail *");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Informe um e-mail válido");
  });
});
