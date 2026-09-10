import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type DisclosureProps = Readonly<{
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  icon?: ReactNode;
  summary: ReactNode;
}>;

/**
 * Revelação progressiva com `<details>` nativo: funciona sem JavaScript, com
 * teclado e leitor de tela, e não carrega o conteúdo para a frente da ação
 * principal (técnica do exercício, observações, detalhes secundários).
 */
export function Disclosure({ children, className, defaultOpen, icon, summary }: DisclosureProps) {
  return (
    <details
      className={`group rounded-wt-lg border border-wt-border bg-wt-surface ${className ?? ""}`}
      open={defaultOpen}
    >
      <summary className="flex min-h-12 items-center gap-3 rounded-wt-lg px-4 py-2 text-wt-label font-semibold text-wt-text-primary hover:bg-wt-surface-elevated">
        {icon ? (
          <span aria-hidden="true" className="text-wt-text-secondary [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-wt-text-secondary transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-wt-border px-4 py-4">{children}</div>
    </details>
  );
}
