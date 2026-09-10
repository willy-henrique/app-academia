type AvatarProps = Readonly<{
  className?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}>;

const sizes = {
  lg: "size-16 text-xl",
  md: "size-11 text-base",
  sm: "size-9 text-sm",
} as const;

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("pt-BR");
}

/** Iniciais do nome público. Decorativo: o nome sempre aparece em texto ao lado. */
export function Avatar({ className, name, size = "md" }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-wt-full bg-wt-accent-subtle font-bold text-wt-accent-text ${sizes[size]} ${className ?? ""}`}
    >
      {getInitials(name)}
    </span>
  );
}
