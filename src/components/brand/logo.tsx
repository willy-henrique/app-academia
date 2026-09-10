type LogoMarkProps = Readonly<{
  className?: string;
  size?: "sm" | "md" | "lg";
}>;

const markSizes = {
  lg: "size-11 rounded-[0.9rem] text-sm",
  md: "size-9 rounded-[0.75rem] text-xs",
  sm: "size-8 rounded-[0.65rem] text-[0.7rem]",
} as const;

/**
 * Marca WT. O gradiente da marca aparece só aqui e em destaques da landing —
 * é identidade, não decoração de interface.
 */
export function LogoMark({ className, size = "md" }: LogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`wt-brand-gradient grid shrink-0 place-items-center font-black tracking-[-0.02em] text-wt-accent-foreground ${markSizes[size]} ${className ?? ""}`}
    >
      WT
    </span>
  );
}

type LogoProps = Readonly<{
  className?: string;
  size?: "sm" | "md" | "lg";
}>;

/** Marca + nome. Decorativa: quem a envolve (link) define o nome acessível. */
export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-wt-text-primary ${className ?? ""}`}>
      <LogoMark size={size} />
      <span
        className={`font-extrabold tracking-[-0.035em] ${size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg"}`}
      >
        WillTreino
      </span>
    </span>
  );
}
