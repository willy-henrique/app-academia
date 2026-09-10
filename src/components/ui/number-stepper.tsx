"use client";

import { Minus, Plus } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";

type NumberStepperProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "size" | "type" | "value"
> & {
  /** Casas decimais preservadas ao somar/subtrair (0 para reps, 1 para kg). */
  decimals?: number;
  hint?: string;
  label: string;
  max?: number;
  min?: number;
  onValueChange: (value: string) => void;
  size?: "default" | "large";
  step: number;
  unit?: string;
  value: string;
};

function formatStepped(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  // "22.50" → "22.5" e "10.0" → "10": o campo mostra só o que importa.
  return decimals > 0 ? String(Number(fixed)) : fixed;
}

/**
 * Campo numérico com botões − / + grandes, pensado para quem está no meio de
 * uma série: dá para ajustar carga ou repetições com o polegar sem abrir o
 * teclado. O `input` continua editável (teclado numérico no celular) e é o
 * dono do valor — os botões só somam `step` a partir dele.
 */
export function NumberStepper({
  className,
  decimals = 0,
  hint,
  id,
  inputMode,
  label,
  max,
  min = 0,
  onValueChange,
  size = "default",
  step,
  unit,
  value,
  ...props
}: NumberStepperProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const unitId = unit ? `${inputId}-unit` : undefined;
  const describedBy = [unitId, hintId].filter(Boolean).join(" ") || undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  const current = Number.isFinite(parsed) ? parsed : min;
  const canDecrease = current - step >= min - 1e-9;
  const canIncrease = max === undefined || current + step <= max + 1e-9;
  const large = size === "large";

  function change(delta: number) {
    const next = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, current + delta));
    onValueChange(formatStepped(next, decimals));
  }

  const buttonClassName = `grid shrink-0 place-items-center rounded-wt-md border border-wt-border bg-wt-surface text-wt-text-primary transition-[background-color,transform] duration-150 hover:bg-wt-surface-elevated active:scale-95 disabled:opacity-40 motion-reduce:transition-none ${
    large ? "size-14" : "size-11"
  }`;

  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <label className="wt-text-label text-wt-text-secondary-strong" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          aria-controls={inputId}
          aria-label={`Diminuir ${label.toLocaleLowerCase("pt-BR")}`}
          className={buttonClassName}
          disabled={!canDecrease || props.disabled}
          type="button"
          onClick={() => change(-step)}
        >
          <Minus aria-hidden="true" className={large ? "size-6" : "size-5"} />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            {...props}
            aria-describedby={describedBy}
            className={`w-full rounded-wt-md border border-transparent bg-wt-surface-elevated text-center font-bold text-wt-text-primary transition-[border-color] duration-150 wt-tabular hover:border-wt-border focus-visible:border-wt-accent-hover focus-visible:bg-wt-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wt-focus motion-reduce:transition-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
              large ? "min-h-14 text-[1.75rem]" : "min-h-11 text-xl"
            } ${unit ? "pr-10" : ""}`}
            id={inputId}
            inputMode={inputMode ?? (decimals > 0 ? "decimal" : "numeric")}
            max={max}
            min={min}
            // `any`: o passo dos botões (ex.: 2,5 kg) não pode virar regra de
            // validação nativa — 24 kg bloquearia o envio da série.
            step="any"
            type="number"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
          />
          {unit ? (
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-wt-label font-semibold text-wt-text-secondary"
              id={unitId}
            >
              {unit}
            </span>
          ) : null}
        </div>
        <button
          aria-controls={inputId}
          aria-label={`Aumentar ${label.toLocaleLowerCase("pt-BR")}`}
          className={buttonClassName}
          disabled={!canIncrease || props.disabled}
          type="button"
          onClick={() => change(step)}
        >
          <Plus aria-hidden="true" className={large ? "size-6" : "size-5"} />
        </button>
      </div>
      {hint ? (
        <p className="wt-text-caption" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
