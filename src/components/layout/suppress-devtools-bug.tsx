"use client";

import { useEffect } from "react";

/**
 * Intercepta e silencia o bug conhecido do Chrome DevTools / Performance panel:
 * Uncaught TypeError: Cannot read properties of undefined (reading 'startTime') at et.reportAllChanges
 * (GoogleChrome/web-vitals/issues/792 / Chrome 128+ soft navigation profiler bug).
 * Não suprime outros erros reais da aplicação.
 */
export function SuppressChromeDevToolsBug() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      if (
        event.message?.includes("reading 'startTime'") ||
        event.message?.includes("reportAllChanges") ||
        event.filename?.includes("VM")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("error", handleError, true);
    return () => window.removeEventListener("error", handleError, true);
  }, []);

  return null;
}
