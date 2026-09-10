import { useId } from "react";
import type { InputHTMLAttributes } from "react";

export type OptionCardChoice = Readonly<{
  description?: string;
  label: string;
  value: string;
}>;

export type OptionCardsProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> & {
  error?: string;
  hint?: string;
  label: string;
  options: readonly OptionCardChoice[];
  /** Valor atual, quando o formulário controla a seleção. */
  value?: string | null;
};

/**
 * Escolha única apresentada como cartões tocáveis.
 *
 * Por baixo são `input[type=radio]` de verdade: teclado, leitor de tela e
 * autofill continuam funcionando de graça, e o cartão é só a etiqueta. O radio
 * fica invisível mas focável (`sr-only` + `peer`), então o anel de foco aparece
 * no cartão — nunca somem as pistas de foco.
 */
export function OptionCards({
  className,
  error,
  hint,
  id,
  label,
  options,
  value,
  ...props
}: OptionCardsProps) {
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const hintId = hint ? `${groupId}-hint` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-3">
      <p className="wt-text-label text-wt-text-primary" id={`${groupId}-label`}>
        {label}
      </p>
      <div
        aria-describedby={describedBy}
        aria-labelledby={`${groupId}-label`}
        className={`grid gap-2 sm:grid-cols-2 ${className ?? ""}`}
        role="radiogroup"
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;

          return (
            <div className="relative" key={option.value}>
              <input
                {...props}
                checked={value === undefined ? undefined : value === option.value}
                className="peer sr-only"
                id={optionId}
                type="radio"
                value={option.value}
              />
              <label
                className="flex min-h-12 cursor-pointer flex-col justify-center gap-1 rounded-wt-lg border border-wt-border bg-wt-surface px-4 py-3 transition-[background-color,border-color,transform] duration-150 hover:border-wt-border-strong active:scale-[0.99] peer-checked:border-wt-accent-border peer-checked:bg-wt-accent-subtle peer-checked:[&_[data-dot]]:bg-wt-accent-hover peer-checked:[&_[data-ring]]:border-wt-accent-hover peer-checked:[&_[data-label]]:text-wt-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wt-focus motion-reduce:transition-none motion-reduce:active:scale-100"
                htmlFor={optionId}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="grid size-[1.125rem] shrink-0 place-items-center rounded-wt-full border-2 border-wt-border-strong transition-colors duration-150"
                    data-ring=""
                  >
                    <span
                      className="size-2 rounded-wt-full bg-transparent transition-colors duration-150"
                      data-dot=""
                    />
                  </span>
                  <span className="wt-text-body font-medium text-wt-text-primary" data-label="">
                    {option.label}
                  </span>
                </span>
                {option.description ? (
                  <span className="wt-text-caption pl-7">{option.description}</span>
                ) : null}
              </label>
            </div>
          );
        })}
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
