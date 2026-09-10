import { AlertCircle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { Skeleton } from "./skeleton";

type EmptyStateProps = Readonly<{
  action?: ReactNode;
  className?: string;
  description?: string;
  icon?: ReactNode;
  title: string;
}>;

/** Vazio útil: diz o que ainda não existe e qual é o próximo passo. */
export function EmptyState({ action, className, description, icon, title }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-wt-lg border border-dashed border-wt-border-strong px-5 py-8 text-center ${className ?? ""}`}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-wt-full bg-wt-surface-elevated text-wt-text-secondary [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <div className="max-w-sm space-y-1">
        <p className="wt-text-h3 text-wt-text-primary">{title}</p>
        {description ? (
          <p className="text-wt-body-sm text-wt-text-secondary-strong">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

type ErrorStateProps = Readonly<{
  /** Caminho alternativo além de tentar de novo (ex.: abrir o treino offline). */
  action?: ReactNode;
  className?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
}>;

/**
 * Erro com resposta: o que aconteceu, se dá para resolver e qual a ação. Nunca
 * recebe mensagem crua do Firebase — só texto escrito para pessoas.
 */
export function ErrorState({
  action,
  className,
  description,
  onRetry,
  retryLabel = "Tentar novamente",
  title,
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-wt-lg border border-wt-danger/30 bg-wt-danger-subtle px-4 py-4 sm:flex-row sm:items-center ${className ?? ""}`}
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="size-5 shrink-0 text-wt-danger-text" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="wt-text-label font-semibold text-wt-danger-text">{title}</p>
        {description ? (
          <p className="text-wt-body-sm text-wt-text-secondary-strong">{description}</p>
        ) : null}
      </div>
      {onRetry || action ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              <RotateCw aria-hidden="true" className="size-4" />
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

type LoadingStateProps = Readonly<{
  className?: string;
  /** Anunciado para leitor de tela; o esqueleto em si é decorativo. */
  label: string;
  /** Forma aproximada do conteúdo que vai chegar, para não haver salto de layout. */
  lines?: number;
  variant?: "card" | "list";
}>;

/** Esqueleto no formato do conteúdo, em vez de spinner gigante. */
export function LoadingState({ className, label, lines = 3, variant = "card" }: LoadingStateProps) {
  return (
    <div aria-busy="true" className={`space-y-3 ${className ?? ""}`}>
      <p className="sr-only" role="status">
        {label}
      </p>
      {variant === "card" ? (
        <div className="space-y-4 rounded-wt-card border border-wt-border bg-wt-surface p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-2/3" />
          {Array.from({ length: Math.max(0, lines - 2) }, (_, index) => (
            <Skeleton className="h-4 w-full" key={index} />
          ))}
          <Skeleton className="h-12 w-full rounded-wt-md" />
        </div>
      ) : (
        Array.from({ length: lines }, (_, index) => (
          <Skeleton className="h-16 w-full rounded-wt-lg" key={index} />
        ))
      )}
    </div>
  );
}
