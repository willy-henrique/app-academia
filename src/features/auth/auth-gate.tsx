"use client";

import { useEffect, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "./auth-session-provider";

type AuthGateProps = Readonly<{
  children: ReactNode;
  redirectTo?: string;
}>;

export function AuthGate({ children, redirectTo = "/login" }: AuthGateProps) {
  const router = useRouter();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, status]);

  if (status === "loading") {
    return (
      <main
        aria-busy="true"
        aria-describedby="auth-session-loading"
        className="flex min-h-dvh items-center justify-center bg-wt-background px-6"
        id="main-content"
      >
        <div className="flex max-w-xs flex-col items-center gap-3 text-center text-wt-text-secondary">
          <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-wt-accent" />
          <p className="text-sm font-medium" id="auth-session-loading" role="status">
            Conferindo sua sessão com segurança…
          </p>
        </div>
      </main>
    );
  }

  if (status === "anonymous") {
    return null;
  }

  return children;
}
