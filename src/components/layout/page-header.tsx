import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  title: string;
}>;

/**
 * Anatomia padrão das páginas autenticadas: título (o único `h1`), descrição
 * curta e ações. No celular as ações descem para baixo do texto; no desktop
 * ficam alinhadas à direita.
 */
export function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className ?? ""}`}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="wt-kicker">{eyebrow}</p> : null}
        <h1 className="wt-text-h1 text-wt-text-primary">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-wt-body-sm text-wt-text-secondary-strong sm:text-wt-body">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

type SectionHeaderProps = Readonly<{
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  id?: string;
  title: string;
}>;

/** Título de seção (`h2`) com ação opcional à direita, ex.: "Ver tudo". */
export function SectionHeader({ action, className, description, id, title }: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-3 ${className ?? ""}`}>
      <div className="min-w-0 space-y-0.5">
        <h2 className="wt-text-h2 text-wt-text-primary" id={id}>
          {title}
        </h2>
        {description ? (
          <p className="text-wt-body-sm text-wt-text-secondary-strong">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
