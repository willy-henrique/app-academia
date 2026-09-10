"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

export type ToastVariant = "info" | "success" | "warning" | "danger";

export type ToastMessage = {
  description?: string;
  id: string;
  title: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  dismissToast: (id: string) => void;
  showToast: (message: ToastMessage) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClassNames: Record<ToastVariant, string> = {
  danger: "before:bg-wt-danger",
  info: "before:bg-wt-accent",
  success: "before:bg-wt-success",
  warning: "before:bg-wt-warning",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: ToastMessage) => {
    setToasts((currentToasts) => {
      if (currentToasts.some((toast) => toast.id === message.id)) {
        return currentToasts;
      }

      return [...currentToasts, message];
    });
  }, []);

  const value = useMemo(() => ({ dismissToast, showToast }), [dismissToast, showToast]);

  return (
    <ToastContext value={value}>
      <ToastPrimitive.Provider duration={6000} swipeDirection="right">
        {children}
        {toasts.map((toast) => {
          const variant = toast.variant ?? "info";
          const role = variant === "danger" || variant === "warning" ? "alert" : "status";

          return (
            <ToastPrimitive.Root
              className={`wt-sheet-in relative grid w-full grid-cols-[1fr_auto] items-center gap-x-3 overflow-hidden rounded-wt-lg border border-wt-border bg-wt-surface py-3 pl-5 pr-2 text-wt-text-primary shadow-wt-elevated before:absolute before:inset-y-0 before:left-0 before:w-1 ${variantClassNames[variant]}`}
              key={toast.id}
              onOpenChange={(open) => {
                if (!open) {
                  dismissToast(toast.id);
                }
              }}
              role={role}
            >
              <div className="space-y-1">
                <ToastPrimitive.Title className="wt-text-label font-semibold text-wt-text-primary">
                  {toast.title}
                </ToastPrimitive.Title>
                {toast.description ? (
                  <ToastPrimitive.Description className="text-wt-body-sm text-wt-text-secondary-strong">
                    {toast.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label={`Fechar: ${toast.title}`}
                className="grid size-11 place-items-center rounded-wt-md text-wt-text-secondary hover:bg-wt-surface-elevated hover:text-wt-text-primary"
              >
                <X aria-hidden="true" className="size-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        {/* No celular o toast fica acima da navegação inferior; no desktop, no canto. */}
        <ToastPrimitive.Viewport className="fixed inset-x-4 bottom-[calc(var(--wt-mobile-nav-height)+max(0.75rem,env(safe-area-inset-bottom)))] z-[var(--wt-z-toast)] mx-auto flex w-auto max-w-md flex-col gap-3 outline-none lg:inset-x-auto lg:bottom-6 lg:right-6" />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}

export function useToast(): ToastContextValue {
  const context = use(ToastContext);

  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }

  return context;
}
