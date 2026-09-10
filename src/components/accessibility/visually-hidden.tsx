import type { HTMLAttributes, ReactNode } from "react";

type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function VisuallyHidden({ children, className, ...props }: VisuallyHiddenProps) {
  return (
    <span {...props} className={`sr-only ${className ?? ""}`}>
      {children}
    </span>
  );
}
