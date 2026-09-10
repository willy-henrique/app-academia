export type ProgressTone = "accent" | "success" | "warning";

const toneClassNames: Record<ProgressTone, string> = {
  accent: "bg-wt-accent-hover",
  success: "bg-wt-success",
  warning: "bg-wt-warning",
};

type ProgressBarProps = Readonly<{
  className?: string;
  label: string;
  max: number;
  /** Texto lido pelo leitor de tela, ex.: "3 de 6 exercícios". */
  valueText?: string;
  size?: "sm" | "md";
  tone?: ProgressTone;
  value: number;
}>;

/** Barra de progresso com semântica nativa de `progressbar`. */
export function ProgressBar({
  className,
  label,
  max,
  size = "sm",
  tone = "accent",
  value,
  valueText,
}: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(Math.max(0, value), safeMax);
  const percent = (safeValue / safeMax) * 100;

  return (
    <div
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      aria-valuetext={valueText}
      className={`w-full overflow-hidden rounded-wt-full bg-wt-surface-elevated ${
        size === "md" ? "h-2.5" : "h-1.5"
      } ${className ?? ""}`}
      role="progressbar"
    >
      <div
        className={`h-full origin-left rounded-wt-full transition-[width] duration-200 ease-out motion-reduce:transition-none ${toneClassNames[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
