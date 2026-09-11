"use client";

import { useEffect } from "react";

export function SuppressChromeDevToolsBug() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const msg = event.message || "";
      if (
        msg.includes("startTime") ||
        msg.includes("reportAllChanges") ||
        (event.filename && event.filename.includes("VM"))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason?.message || String(event.reason || "");
      if (reason.includes("startTime") || reason.includes("reportAllChanges")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection, true);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection, true);
    };
  }, []);

  return null;
}