// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { getInitials } from "./avatar";
import { Badge } from "./badge";
import { ChoiceChips } from "./choice-chips";
import { Metric, MetricGrid } from "./metric";
import { NumberStepper } from "./number-stepper";
import { ProgressBar } from "./progress-bar";
import { SegmentedControl } from "./segmented-control";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { Textarea } from "./textarea";

function ControlledStepper({ initial = "22.5" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <NumberStepper
      decimals={1}
      label="Carga"
      step={2.5}
      unit="kg"
      value={value}
      onValueChange={setValue}
    />
  );
}

describe("NumberStepper", () => {
  it("adjusts the value by the step with large labelled buttons", () => {
    render(<ControlledStepper />);

    const input = screen.getByLabelText("Carga") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Aumentar carga" }));
    expect(input.value).toBe("25");

    fireEvent.click(screen.getByRole("button", { name: "Diminuir carga" }));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir carga" }));
    expect(input.value).toBe("20");
  });

  it("never goes below the minimum and keeps a numeric keyboard", () => {
    render(<ControlledStepper initial="1" />);

    const input = screen.getByLabelText("Carga") as HTMLInputElement;
    const decrease = screen.getByRole("button", { name: "Diminuir carga" }) as HTMLButtonElement;

    expect(decrease.disabled).toBe(true);
    expect(input.getAttribute("inputmode")).toBe("decimal");
    // O passo dos botões não vira validação nativa que bloquearia o envio.
    expect(input.getAttribute("step")).toBe("any");
    expect(input.getAttribute("aria-describedby")).toContain("-unit");
  });
});

describe("SegmentedControl", () => {
  it("is a real radio group that reports the chosen value", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="Modalidade"
        options={[
          { label: "Corrida", value: "RUN" },
          { label: "Bicicleta", value: "BIKE" },
        ]}
        value="RUN"
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByRole("group", { name: "Modalidade" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Corrida" }) as HTMLInputElement).checked).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Bicicleta" }));
    expect(onValueChange).toHaveBeenCalledWith("BIKE");
  });
});

describe("ChoiceChips", () => {
  it("toggles several canonical values", () => {
    const onValuesChange = vi.fn();
    render(
      <ChoiceChips
        label="Equipamentos"
        options={[
          { label: "Halteres", value: "dumbbell" },
          { label: "Barra", value: "barbell" },
        ]}
        values={["dumbbell"]}
        onValuesChange={onValuesChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Barra" }));
    expect(onValuesChange).toHaveBeenLastCalledWith(["dumbbell", "barbell"]);

    fireEvent.click(screen.getByRole("checkbox", { name: /Halteres/ }));
    expect(onValuesChange).toHaveBeenLastCalledWith([]);
  });
});

describe("ProgressBar", () => {
  it("exposes progress semantics with a readable value", () => {
    render(<ProgressBar label="Progresso do treino" max={6} value={2} valueText="2 de 6" />);

    const bar = screen.getByRole("progressbar", { name: "Progresso do treino" });
    expect(bar.getAttribute("aria-valuenow")).toBe("2");
    expect(bar.getAttribute("aria-valuetext")).toBe("2 de 6");
  });
});

describe("feedback states", () => {
  it("gives empty states a next action", () => {
    render(
      <EmptyState
        action={<button type="button">Começar treino</button>}
        title="Nenhum treino ainda"
      />,
    );

    expect(screen.getByText("Nenhum treino ainda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Começar treino" })).toBeTruthy();
  });

  it("announces errors and offers a retry", () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Não conseguimos carregar seus treinos." onRetry={onRetry} />);

    expect(screen.getByRole("alert").textContent).toContain("Não conseguimos carregar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("announces loading without exposing the skeleton", () => {
    const { container } = render(<LoadingState label="Carregando sua semana" />);

    expect(screen.getByRole("status").textContent).toBe("Carregando sua semana");
    expect(container.firstElementChild?.getAttribute("aria-busy")).toBe("true");
  });
});

describe("small primitives", () => {
  it("keeps state readable as text in badges", () => {
    render(<Badge tone="success">Concluído</Badge>);
    expect(screen.getByText("Concluído").className).toContain("text-wt-success-text");
  });

  it("pairs metric label and value in a description list", () => {
    render(
      <MetricGrid>
        <Metric label="Volume" unit="kg" value="32.450" />
      </MetricGrid>,
    );

    expect(screen.getByRole("term").textContent).toBe("Volume");
    expect(screen.getByRole("definition").textContent).toContain("32.450");
  });

  it("labels textareas visibly", () => {
    render(<Textarea label="Observação" />);
    expect(screen.getByLabelText("Observação").tagName).toBe("TEXTAREA");
  });

  it("derives avatar initials from the public name", () => {
    expect(getInitials("Willy Henrique")).toBe("WH");
    expect(getInitials("pedro")).toBe("P");
    expect(getInitials("  ")).toBe("?");
  });
});
