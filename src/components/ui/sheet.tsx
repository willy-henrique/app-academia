"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

type SheetProps = Readonly<{
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title: string;
  trigger?: ReactElement;
}>;

/**
 * Ação contextual responsiva: bottom sheet no celular (perto do polegar) e
 * diálogo centralizado a partir de `sm`. Radix mantém o foco preso, fecha com
 * Esc e devolve o foco ao gatilho.
 */
export function Sheet({
  children,
  closeLabel = "Fechar",
  description,
  onOpenChange,
  open,
  title,
  trigger,
}: SheetProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="wt-fade-in fixed inset-0 z-[var(--wt-z-overlay)] bg-[rgb(15_23_42/0.4)]" />
        <DialogPrimitive.Content
          className="wt-sheet-in fixed inset-x-0 bottom-0 z-[var(--wt-z-modal)] flex max-h-[min(88dvh,44rem)] flex-col rounded-t-wt-xl border border-wt-border bg-wt-surface text-wt-text-primary shadow-wt-elevated outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(calc(100vw-2rem),32rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-wt-xl"
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-10 rounded-full bg-wt-border sm:hidden"
          />
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-3 sm:pt-5">
            <div className="min-w-0 space-y-1">
              <DialogPrimitive.Title className="wt-text-h2">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-wt-body-sm text-wt-text-secondary-strong">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-wt-md text-wt-text-secondary hover:bg-wt-surface-elevated hover:text-wt-text-primary"
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
