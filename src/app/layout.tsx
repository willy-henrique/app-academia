import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "WillTreino",
  description: "Planeje e execute treinos solo ou acompanhados, com privacidade por padrão.",
  title: "WillTreino",
};

export const viewport: Viewport = {
  // Espelha --wt-color-background: a barra do navegador acompanha o tema claro.
  themeColor: "#f7f8fa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type RootLayoutProps = Readonly<{ children: ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
