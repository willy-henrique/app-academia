"use client";

import { useId, type ReactNode } from "react";

export type SegmentedOption<Value extends string> = Readonly<{
  icon?: ReactNode;
  label: string;
  value: Value;
}>;

type SegmentedControlProps<Value extends string> = Readonly<{
  className?: string;
  disabled?: boolean;
  /** Mostra o rótulo do grupo na tela; quando falso, ele fica só para leitor de tela. */
  hideLabel?: boolean;
  label: string;
  name?: string;
  onValueChange: (value: Value) => void;
  options: readonly SegmentedOption<Value>[];
  value: Value | null;
}>;

/**
 * Escolha única e curta (2–4 opções) em pílulas. São `input[type=radio]` reais:
 * setas do teclado trocam a opção e o leitor de tela anuncia "1 de 3". O estado
 * selecionado usa fundo, cor e peso — nunca só a cor.
 */
export function SegmentedControl<Value extends string>({
  className,
  disabled,
  hideLabel = false,
  label,
  name,
  onValueChange,
  options,
  value,
}: SegmentedControlProps<Value>) {
  const generatedId = useId();
  const groupName = name ?? generatedId;

  return (
    <fieldset className={`min-w-0 ${className ?? ""}`} disabled={disabled}>
      <legend className={hideLabel ? "sr-only" : "mb-2 wt-text-label text-wt-text-primary"}>
        {label}
      </legend>
      <div className="flex gap-1 overflow-x-auto rounded-wt-lg bg-wt-surface-elevated p-1 [scrollbar-width:none]">
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`;

          return (
            <div className="relative min-w-0 flex-1" key={option.value}>
              <input
                checked={value === option.value}
                className="peer sr-only"
                id={optionId}
                name={groupName}
                type="radio"
                value={option.value}
                onChange={() => onValueChange(option.value)}
              />
              <label
                className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-wt-md px-3 text-wt-label font-medium text-wt-text-secondary-strong transition-[background-color,color,box-shadow] duration-150 hover:text-wt-text-primary peer-checked:bg-wt-surface peer-checked:font-semibold peer-checked:text-wt-accent-text peer-checked:shadow-[0_1px_2px_rgb(15_23_42/0.08)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-wt-focus peer-disabled:cursor-not-allowed peer-disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-4"
                htmlFor={optionId}
              >
                {option.icon ? <span aria-hidden="true">{option.icon}</span> : null}
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
