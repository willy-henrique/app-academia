import type { AnchorHTMLAttributes, ReactNode } from "react";

type SkipLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & {
  children?: ReactNode;
  href?: `#${string}`;
};

/** Permite que teclado e leitor de tela pulem diretamente para o conteúdo principal. */
export function SkipLink({
  children = "Pular para o conteúdo",
  href = "#main-content",
  ...props
}: SkipLinkProps) {
  return (
    <a
      {...props}
      className={`sr-only fixed left-4 top-4 z-[60] rounded-wt-md bg-wt-accent px-4 py-3 font-semibold text-wt-accent-foreground focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wt-focus ${props.className ?? ""}`}
      href={href}
    >
      {children}
    </a>
  );
}
