import type { HTMLAttributes } from "react";

type SkeletonProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;

/**
 * Espaçador visual para carregamento. O conteúdo real deve informar `aria-busy`
 * no container responsável; este elemento não é anunciado como informação.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={`wt-skeleton rounded-wt-sm bg-wt-surface-elevated ${className ?? ""}`}
    />
  );
}
