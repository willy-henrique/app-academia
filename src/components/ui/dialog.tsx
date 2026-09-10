"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

type DialogProps = {
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title: string;
  trigger: ReactElement;
};

/**
 * Modal acessível para confirmações e tarefas que exigem atenção imediata.
 * O Radix mantém o foco dentro do modal e o devolve ao gatilho ao fechá-lo.
 */
export function Dialog({
  children,
  closeLabel = "Fechar diálogo",
  description,
  onOpenChange,
  open,
  title,
  trigger,
}: DialogProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="wt-fade-in fixed inset-0 z-[var(--wt-z-overlay)] bg-[rgb(15_23_42/0.4)]" />
        <DialogPrimitive.Content
          className="wt-pop-in fixed inset-x-4 top-1/2 z-[var(--wt-z-modal)] max-h-[calc(100dvh-2rem)] w-auto -translate-y-1/2 overflow-y-auto rounded-wt-xl border border-wt-border bg-wt-surface p-5 text-wt-text-primary shadow-wt-elevated outline-none sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:p-6"
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="wt-text-h2 text-wt-text-primary">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-wt-body-sm text-wt-text-secondary-strong">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-wt-md text-wt-text-secondary hover:bg-wt-surface-elevated hover:text-wt-text-primary"
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
