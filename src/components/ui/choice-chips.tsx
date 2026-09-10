"use client";

import { Check } from "lucide-react";
import { useId } from "react";

export type ChoiceChip<Value extends string> = Readonly<{
  label: string;
  value: Value;
}>;

type ChoiceChipsProps<Value extends string> = Readonly<{
  hint?: string;
  label: string;
  onValuesChange: (values: Value[]) => void;
  options: readonly ChoiceChip<Value>[];
  values: readonly Value[];
}>;

/**
 * Múltipla escolha em chips (equipamentos, necessidades). Checkboxes nativos
 * por baixo; o chip marcado ganha ícone de check além da cor, para o estado não
 * depender só de cor.
 */
export function ChoiceChips<Value extends string>({
  hint,
  label,
  onValuesChange,
  options,
  values,
}: ChoiceChipsProps<Value>) {
  const groupId = useId();
  const hintId = hint ? `${groupId}-hint` : undefined;
  const selected = new Set<string>(values);

  function toggle(value: Value) {
    const next = selected.has(value)
      ? values.filter((current) => current !== value)
      : [...values, value];
    onValuesChange(next);
  }

  return (
    <fieldset aria-describedby={hintId} className="min-w-0">
      <legend className="mb-2 wt-text-label text-wt-text-primary">{label}</legend>
      {hint ? (
        <p className="-mt-1 mb-3 wt-text-caption" id={hintId}>
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const checked = selected.has(option.value);

          return (
            <div className="relative" key={option.value}>
              <input
                checked={checked}
                className="peer sr-only"
                id={optionId}
                type="checkbox"
                value={option.value}
                onChange={() => toggle(option.value)}
              />
              <label
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-wt-full border border-wt-border bg-wt-surface px-4 text-wt-label font-medium text-wt-text-primary transition-[background-color,border-color,color] duration-150 hover:border-wt-border-strong peer-checked:border-wt-accent-border peer-checked:bg-wt-accent-subtle peer-checked:text-wt-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wt-focus motion-reduce:transition-none"
                htmlFor={optionId}
              >
                {checked ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : null}
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
