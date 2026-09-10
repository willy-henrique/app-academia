"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  getFirebaseClientServices,
  hasFirebaseClientConfig,
} from "@/infrastructure/firebase/client";

import {
  isLocalDevelopmentAuthEnabled,
  subscribeToLocalDevelopmentSession,
  type LocalDevelopmentSession,
} from "./local-development-auth";

export type AuthSessionStatus = "loading" | "anonymous" | "authenticated";

export type SessionUser = Pick<
  User,
  "displayName" | "email" | "emailVerified" | "photoURL" | "providerId" | "uid"
> &
  Partial<Pick<User, "getIdToken">>;

function toLocalSessionUser(session: LocalDevelopmentSession): SessionUser {
  return {
    displayName: session.email.split("@")[0] || "Pessoa local",
    email: session.email,
    emailVerified: true,
    photoURL: null,
    providerId: "willtreino-local-development",
    uid: session.uid,
  };
}

export type AuthSession = Readonly<{
  mode: "firebase" | "local";
  status: AuthSessionStatus;
  user: SessionUser | null;
}>;

type AuthSessionContextValue = AuthSession;

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  // Modo e disponibilidade do Firebase vêm de variáveis de ambiente embutidas
  // no bundle: são constantes na sessão e idênticas no servidor e no cliente.
  // Derivar em vez de guardar em estado evita um primeiro render com o modo
  // errado e dispensa corrigir o estado de dentro do efeito.
  const mode: AuthSession["mode"] = isLocalDevelopmentAuthEnabled() ? "local" : "firebase";
  const canStartSession = mode === "local" || hasFirebaseClientConfig();

  const [status, setStatus] = useState<AuthSessionStatus>(
    canStartSession ? "loading" : "anonymous",
  );
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (isLocalDevelopmentAuthEnabled()) {
      return subscribeToLocalDevelopmentSession((session) => {
        setUser(session ? toLocalSessionUser(session) : null);
        setStatus(session ? "authenticated" : "anonymous");
      });
    }

    // Sem configuração não há sessão a observar: o estado inicial já é anônimo.
    if (!hasFirebaseClientConfig()) {
      return undefined;
    }

    const { auth } = getFirebaseClientServices();

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "anonymous");
    });
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({ mode, status, user }),
    [mode, status, user],
  );

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>;
}

export function useAuthSession(): AuthSession {
  const context = use(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession deve ser usado dentro de AuthSessionProvider.");
  }

  return context;
}
