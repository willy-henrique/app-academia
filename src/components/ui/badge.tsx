import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneClassNames: Record<BadgeTone, string> = {
  accent: "bg-wt-accent-subtle text-wt-accent-text",
  danger: "bg-wt-danger-subtle text-wt-danger-text",
  info: "bg-wt-info-subtle text-wt-info-text",
  neutral: "bg-wt-surface-elevated text-wt-text-secondary-strong",
  success: "bg-wt-success-subtle text-wt-success-text",
  warning: "bg-wt-warning-subtle text-wt-warning-text",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  /** Ícone decorativo; o estado precisa estar no texto, nunca só na cor. */
  icon?: ReactNode;
  tone?: BadgeTone;
};

/** Rótulo de estado curto: texto + tom (e ícone opcional). */
export function Badge({ children, className, icon, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-wt-full px-2.5 py-0.5 text-xs font-semibold leading-tight ${toneClassNames[tone]} ${className ?? ""}`}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-3.5">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
