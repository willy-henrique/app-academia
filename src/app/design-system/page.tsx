import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignSystemShowcase } from "@/features/design-system/design-system-showcase";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Design System · WillTreino",
};

/**
 * Referência viva dos tokens e componentes. Existe só em desenvolvimento e
 * homologação: em produção a rota responde 404.
 */
export default function DesignSystemPage() {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    notFound();
  }

  return <DesignSystemShowcase />;
}
