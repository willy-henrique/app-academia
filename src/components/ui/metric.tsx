import type { ReactNode } from "react";

type MetricProps = Readonly<{
  className?: string;
  /** Contexto curto abaixo do número (ex.: "de 4 planejados"). */
  context?: ReactNode;
  icon?: ReactNode;
  label: string;
  size?: "default" | "large";
  unit?: string;
  value: ReactNode;
}>;

/**
 * Número importante com rótulo. Renderiza um par `dt`/`dd`, então deve ficar
 * dentro de um `<dl>` (ver `MetricGrid`) para o leitor de tela ler "Volume,
 * 32.450 kg" como uma informação só.
 */
export function Metric({
  className,
  context,
  icon,
  label,
  size = "default",
  unit,
  value,
}: MetricProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}>
      <dt className="flex items-center gap-1.5 wt-text-label font-medium text-wt-text-secondary-strong">
        {icon ? (
          <span aria-hidden="true" className="text-wt-text-secondary [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        {label}
      </dt>
      <dd className="m-0">
        <span
          className={`wt-text-metric text-wt-text-primary ${size === "large" ? "text-[2.25rem]" : ""}`}
        >
          {value}
        </span>
        {unit ? (
          <>
            {" "}
            <span className="text-wt-label font-semibold text-wt-text-secondary-strong">{unit}</span>
          </>
        ) : null}
        {context ? (
          <span className="mt-0.5 block wt-text-caption text-wt-text-secondary-strong">
            {context}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

type MetricGridProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export function MetricGrid({ children, className }: MetricGridProps) {
  return <dl className={`m-0 grid gap-x-4 gap-y-5 ${className ?? ""}`}>{children}</dl>;
}
