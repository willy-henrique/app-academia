/**
 * Espelho tipado dos tokens de `src/app/globals.css`, para quando um valor
 * precisa ir por `style` (larguras calculadas, cores de gráficos). A fonte de
 * verdade continua sendo o CSS: aqui só há referências `var(--wt-*)`.
 */
export const designTokens = {
  color: {
    background: "var(--wt-color-background)",
    surface: "var(--wt-color-surface)",
    surfaceElevated: "var(--wt-color-surface-elevated)",
    border: "var(--wt-color-border)",
    textPrimary: "var(--wt-color-text-primary)",
    textSecondary: "var(--wt-color-text-secondary)",
    accent: "var(--wt-color-accent)",
    accentSubtle: "var(--wt-color-accent-subtle)",
    accentText: "var(--wt-color-accent-text)",
    accentForeground: "var(--wt-color-accent-foreground)",
    success: "var(--wt-color-success)",
    successText: "var(--wt-color-success-text)",
    warning: "var(--wt-color-warning)",
    warningText: "var(--wt-color-warning-text)",
    danger: "var(--wt-color-danger)",
    dangerText: "var(--wt-color-danger-text)",
    info: "var(--wt-color-info)",
    focus: "var(--wt-color-focus)",
  },
  radius: {
    small: "var(--wt-radius-sm)",
    medium: "var(--wt-radius-md)",
    large: "var(--wt-radius-lg)",
    card: "var(--wt-radius-card)",
    xl: "var(--wt-radius-xl)",
    hero: "var(--wt-radius-hero)",
    full: "var(--wt-radius-full)",
  },
  shadow: {
    surface: "var(--wt-shadow-surface)",
    elevated: "var(--wt-shadow-elevated)",
  },
  typography: {
    display: "var(--wt-font-size-display)",
    heading: "var(--wt-font-size-heading)",
    h1: "var(--wt-font-size-h1)",
    h2: "var(--wt-font-size-h2)",
    h3: "var(--wt-font-size-h3)",
    title: "var(--wt-font-size-title)",
    body: "var(--wt-font-size-body)",
    bodySmall: "var(--wt-font-size-body-sm)",
    label: "var(--wt-font-size-label)",
    caption: "var(--wt-font-size-caption)",
    metric: "var(--wt-font-size-metric)",
    metricLarge: "var(--wt-font-size-metric-lg)",
  },
  motion: {
    fast: "var(--wt-duration-fast)",
    base: "var(--wt-duration-base)",
    slow: "var(--wt-duration-slow)",
    easeOut: "var(--wt-ease-out)",
  },
  zIndex: {
    sticky: "var(--wt-z-sticky)",
    nav: "var(--wt-z-nav)",
    overlay: "var(--wt-z-overlay)",
    modal: "var(--wt-z-modal)",
    toast: "var(--wt-z-toast)",
  },
  container: {
    form: "var(--wt-container-form)",
    reading: "var(--wt-container-reading)",
    app: "var(--wt-container-app)",
    wide: "var(--wt-container-wide)",
  },
} as const;

export type DesignTokens = typeof designTokens;
