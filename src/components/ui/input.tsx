import { useId } from "react";
import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label: string;
  /** Unidade exibida dentro do campo (kg, cm, min). Não faz parte do valor. */
  unit?: string;
};

export const fieldControlClassName =
  "min-h-11 w-full rounded-wt-md border bg-wt-surface px-3 text-wt-body text-wt-text-primary placeholder:text-wt-text-muted transition-[border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wt-focus disabled:cursor-not-allowed disabled:bg-wt-surface-elevated disabled:opacity-60 motion-reduce:transition-none";

export function fieldBorderClassName(error?: string): string {
  return error
    ? "border-wt-danger focus-visible:border-wt-danger"
    : "border-wt-border hover:border-wt-border-strong focus-visible:border-wt-accent-hover";
}

export function Input({ className, error, hint, id, label, required, unit, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const unitId = unit ? `${inputId}-unit` : undefined;
  const describedBy =
    [props["aria-describedby"], unitId, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <label className="wt-text-label text-wt-text-primary" htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="relative">
        <input
          {...props}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${fieldControlClassName} ${fieldBorderClassName(error)} ${
            unit ? "pr-12" : ""
          } ${className ?? ""}`}
          id={inputId}
          required={required}
        />
        {unit ? (
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-wt-label text-wt-text-secondary"
            id={unitId}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p className="wt-text-caption" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="wt-text-caption font-medium text-wt-danger-text" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
