import Link from "next/link";

import { Logo } from "@/components/brand/logo";

import { isActiveNavigationItem, type NavigationItem } from "./mobile-nav";

export type NavigationSection = Readonly<{
  items: readonly NavigationItem[];
  label: string;
}>;

type DesktopNavProps = {
  currentPath: string;
  footerItems?: readonly NavigationItem[];
  productName?: string;
  sections: readonly NavigationSection[];
};

function DesktopNavLink({ currentPath, item }: { currentPath: string; item: NavigationItem }) {
  const { href, icon: Icon, label } = item;
  const active = isActiveNavigationItem(item, currentPath);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-wt-md px-3 text-wt-label transition-colors duration-150 ${
        active
          ? "bg-wt-accent-subtle font-semibold text-wt-accent-text"
          : "font-medium text-wt-text-secondary-strong hover:bg-wt-surface-elevated hover:text-wt-text-primary"
      }`}
      href={href}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}

/**
 * Sidebar clara e fixa para planejamento no desktop (≥ 1024 px). Some abaixo
 * disso — a navegação inferior assume — para nunca haver duas navegações
 * visíveis ao mesmo tempo.
 */
export function DesktopNav({
  currentPath,
  footerItems = [],
  productName = "WillTreino",
  sections,
}: DesktopNavProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh border-r border-wt-border bg-wt-surface lg:block">
      <div className="flex h-full w-60 flex-col px-4 py-5">
        <Link
          aria-label={productName}
          className="flex shrink-0 items-center rounded-wt-md px-2 py-1"
          href="/dashboard"
        >
          <Logo size="sm" />
        </Link>
        <nav aria-label="Navegação principal" className="mt-8 flex min-h-0 flex-1 flex-col">
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="mb-1.5 px-3 text-xs font-semibold text-wt-text-secondary">
                  {section.label}
                </p>
                <ul className="grid gap-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <DesktopNavLink currentPath={currentPath} item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {footerItems.length > 0 ? (
            <ul className="mt-auto grid gap-0.5 border-t border-wt-border pt-4">
              {footerItems.map((item) => (
                <li key={item.href}>
                  <DesktopNavLink currentPath={currentPath} item={item} />
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
