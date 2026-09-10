import type { ReactNode } from "react";

type LiveRegionProps = {
  children: ReactNode;
  politeness?: "assertive" | "polite";
  /**
   * Mostra o texto na tela além de anunciá-lo. Use sempre que a mensagem for a
   * única resposta a uma ação do usuário — um erro de formulário, por exemplo:
   * sem isso, quem enxerga clica no botão e não recebe retorno nenhum.
   */
  visible?: boolean;
};

/** Anuncia alterações de estado sem deslocar o foco do usuário. */
export function LiveRegion({ children, politeness = "polite", visible = false }: LiveRegionProps) {
  const isAssertive = politeness === "assertive";

  return (
    <div
      aria-atomic="true"
      aria-live={politeness}
      className={
        visible
          ? "rounded-wt-lg bg-wt-surface-elevated px-4 py-3 text-wt-body-sm text-wt-text-primary"
          : "sr-only"
      }
      role={isAssertive ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
