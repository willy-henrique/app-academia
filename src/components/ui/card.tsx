import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
  children: ReactNode;
  /** Card prioritário (ex.: treino de hoje): ganha a sombra discreta do sistema. */
  elevated?: boolean;
};

/**
 * Superfície neutra. Por padrão só borda — sombra fica para o que realmente
 * precisa se destacar, para a tela não virar uma pilha de cartões flutuando.
 */
export function Card({
  as: Element = "section",
  children,
  className,
  elevated = false,
  ...props
}: CardProps) {
  return (
    <Element
      {...props}
      className={`rounded-wt-card border border-wt-border bg-wt-surface p-4 text-wt-text-primary ${
        elevated ? "shadow-wt-surface" : ""
      } ${className ?? ""}`}
    >
      {children}
    </Element>
  );
}
