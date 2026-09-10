import { useId } from "react";
import type { TextareaHTMLAttributes } from "react";

import { fieldBorderClassName, fieldControlClassName } from "./input";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  hint?: string;
  label: string;
};

/** Mesmo contrato do `Input`: label sempre visível, hint e erro associados. */
export function Textarea({ className, error, hint, id, label, required, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy =
    [props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <label className="wt-text-label text-wt-text-primary" htmlFor={textareaId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <textarea
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`${fieldControlClassName} ${fieldBorderClassName(error)} min-h-24 py-2.5 leading-relaxed ${className ?? ""}`}
        id={textareaId}
        required={required}
      />
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
