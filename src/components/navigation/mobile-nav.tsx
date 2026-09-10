import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Outras rotas que pertencem a esta área (ex.: a sala de grupo é "Treino"). */
  matches?: readonly string[];
};

type MobileNavProps = {
  currentPath: string;
  items: readonly NavigationItem[];
};

export function isActiveNavigationItem(item: NavigationItem, currentPath: string): boolean {
  const prefixes = [item.href, ...(item.matches ?? [])];

  return prefixes.some((prefix) =>
    prefix === "/"
      ? currentPath === prefix
      : currentPath === prefix || currentPath.startsWith(`${prefix}/`),
  );
}

/**
 * Navegação primária até tablet (< 1024 px): no máximo cinco destinos, rótulo
 * sempre visível e área segura inferior respeitada. O item ativo usa ícone mais
 * forte, cor e marcador — não depende só da cor.
 */
export function MobileNav({ currentPath, items }: MobileNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-[var(--wt-z-nav)] border-t border-wt-border bg-wt-surface/95 pb-[env(safe-area-inset-bottom)] shadow-wt-bar backdrop-blur-md supports-[backdrop-filter]:bg-wt-surface/85 lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--wt-mobile-nav-height)] max-w-lg grid-flow-col auto-cols-fr px-1">
        {items.map((item) => {
          const { href, icon: Icon, label } = item;
          const active = isActiveNavigationItem(item, currentPath);

          return (
            <li className="flex" key={href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-wt-md text-[0.6875rem] leading-none transition-colors duration-150 ${
                  active
                    ? "font-bold text-wt-accent-text"
                    : "font-medium text-wt-text-secondary-strong hover:text-wt-text-primary"
                }`}
                href={href}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-wt-full transition-colors duration-150 ${
                    active ? "bg-wt-accent-subtle" : "group-hover:bg-wt-surface-elevated"
                  }`}
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
