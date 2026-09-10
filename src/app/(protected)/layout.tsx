import type { ReactNode } from "react";

import { AppShell } from "@/components/navigation/app-shell";
import { AuthGate } from "@/features/auth/auth-gate";

type ProtectedLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
