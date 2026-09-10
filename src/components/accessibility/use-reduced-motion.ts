"use client";

import { useSyncExternalStore } from "react";

const mediaQuery = "(prefers-reduced-motion: reduce)";

function getReducedMotionPreference(): boolean {
  return typeof window !== "undefined" && window.matchMedia(mediaQuery).matches;
}

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(mediaQuery);
  query.addEventListener("change", onStoreChange);

  return () => query.removeEventListener("change", onStoreChange);
}

/** Preferência do sistema para remover animações não essenciais. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getReducedMotionPreference, () => false);
}
