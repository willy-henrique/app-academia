import { useId } from "react";
import type { SelectHTMLAttributes } from "react";

import { fieldBorderClassName, fieldControlClassName } from "./input";

export type SelectOption = Readonly<{
  label: string;
  value: string;
}>;

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  error?: string;
  hint?: string;
  label: string;
  options: readonly SelectOption[];
  /** Texto do estado vazio. Fica desabilitado: não é uma resposta válida. */
  placeholder?: string;
};

/**
 * Mesmo contrato do `Input` (label visível, hint, erro, 44px de alvo de toque),
 * para que formulário nenhum precise remontar um `select` na mão — foi assim
 * que os valores crus do enum chegaram à tela.
 *
 * `appearance-none` remove a seta do sistema, que varia por SO; a seta é
 * desenhada em SVG com as cores do produto.
 */
export function Select({
  className,
  error,
  hint,
  id,
  label,
  options,
  placeholder,
  required,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy =
    [props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <label className="wt-text-label text-wt-text-primary" htmlFor={selectId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="relative">
        <select
          {...props}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${fieldControlClassName} ${fieldBorderClassName(error)} appearance-none py-2 pr-10 ${className ?? ""}`}
          id={selectId}
          required={required}
        >
          {placeholder ? (
            <option disabled value="">
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-wt-text-secondary"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
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
