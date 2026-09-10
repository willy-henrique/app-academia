"use client";

/**
 * Acesso somente para desenvolvimento local quando o Firebase Auth ainda não
 * está configurado. Não armazena senha, token ou qualquer dado de produção.
 */
const storageKey = "willtreino.local-development-session.v1";
const changeEventName = "willtreino:local-development-auth-changed";

export type LocalDevelopmentSession = Readonly<{
  email: string;
  uid: string;
}>;

function stableLocalUid(email: string): string {
  let value = 5381;

  for (const character of email.toLocaleLowerCase("pt-BR")) {
    value = (value * 33) ^ character.charCodeAt(0);
  }

  return `local-${(value >>> 0).toString(36)}`;
}

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function isLocalDevelopmentAuthEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "development") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "local") {
    return true;
  }
  // Em desenvolvimento, se o navegador estiver usando sessão local (testes ou modo offline), permite
  try {
    return Boolean(browserStorage()?.getItem(storageKey));
  } catch {
    return false;
  }
}

export function readLocalDevelopmentSession(): LocalDevelopmentSession | null {
  if (!isLocalDevelopmentAuthEnabled()) {
    return null;
  }

  const raw = browserStorage()?.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDevelopmentSession>;
    if (typeof parsed.email !== "string" || typeof parsed.uid !== "string") {
      return null;
    }

    return { email: parsed.email, uid: parsed.uid };
  } catch {
    return null;
  }
}

function publishChange(): void {
  window.dispatchEvent(new Event(changeEventName));
}

export function startLocalDevelopmentSession(email: string): LocalDevelopmentSession {
  if (!isLocalDevelopmentAuthEnabled()) {
    throw new Error("O acesso local só pode ser usado em desenvolvimento.");
  }

  const session = {
    email: email.trim().toLocaleLowerCase("pt-BR"),
    uid: stableLocalUid(email),
  };

  browserStorage()?.setItem(storageKey, JSON.stringify(session));
  publishChange();
  return session;
}

export function endLocalDevelopmentSession(): void {
  browserStorage()?.removeItem(storageKey);
  publishChange();
}

export function subscribeToLocalDevelopmentSession(
  onChange: (session: LocalDevelopmentSession | null) => void,
): () => void {
  const update = () => onChange(readLocalDevelopmentSession());

  window.addEventListener(changeEventName, update);
  window.addEventListener("storage", update);
  update();

  return () => {
    window.removeEventListener(changeEventName, update);
    window.removeEventListener("storage", update);
  };
}
