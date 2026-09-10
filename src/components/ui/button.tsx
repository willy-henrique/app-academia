import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/*
 * O foco usa o contorno global (`:focus-visible` em globals.css, 3px no tom de
 * foco). O anel claro anterior ficava quase invisível sobre branco.
 */
export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-wt-md font-semibold transition-[background-color,border-color,color,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 enabled:active:scale-[0.98] motion-reduce:transition-none motion-reduce:enabled:active:scale-100",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "min-h-11 px-4 text-wt-label",
        icon: "size-11 shrink-0 p-0",
        large: "min-h-12 px-5 text-base",
        /** CTA de treino: grande e fácil de tocar com uma mão ocupada. */
        xl: "min-h-14 px-6 text-base font-bold",
      },
      variant: {
        primary: "bg-wt-accent-hover text-wt-accent-foreground hover:bg-wt-accent-active",
        secondary:
          "border border-wt-border bg-wt-surface text-wt-text-primary hover:border-wt-border-strong hover:bg-wt-surface-elevated",
        tonal: "bg-wt-accent-subtle text-wt-accent-text hover:bg-wt-accent-border/60",
        outline:
          "border border-wt-border bg-transparent text-wt-text-primary hover:border-wt-accent-border hover:bg-wt-accent-subtle",
        danger: "bg-wt-danger-strong text-wt-danger-foreground hover:bg-wt-danger-text",
        success: "bg-wt-success text-wt-text-primary hover:brightness-95",
        ghost: "bg-transparent text-wt-text-primary hover:bg-wt-surface-elevated",
      },
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    loadingLabel?: string;
  };

function LoadingIndicator(): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-wt-full border-2 border-current border-r-transparent"
    />
  );
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel = "Carregando",
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={buttonVariants({ className, size, variant })}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? (
        <>
          <LoadingIndicator />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
