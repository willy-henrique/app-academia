"use client";

import { type ReactNode } from "react";

import { AuthSessionProvider } from "@/features/auth/auth-session-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
