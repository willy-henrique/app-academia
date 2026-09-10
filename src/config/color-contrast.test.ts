import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  oklchToRgb,
  parseCssColor,
  parseOklch,
  readThemeColors,
} from "./color-contrast";

const css = readFileSync("src/app/globals.css", "utf8");

const lightTheme = readThemeColors(css, ":root");
const darkTheme = { ...lightTheme, ...readThemeColors(css, '\\[data-theme="dark"\\]') };
const highContrastTheme = { ...lightTheme, ...readThemeColors(css, '\\[data-contrast="high"\\]') };

const themes = [
  { colors: lightTheme, name: "claro (padrão)" },
  { colors: darkTheme, name: "escuro futuro" },
  { colors: highContrastTheme, name: "alto contraste" },
] as const;

describe("contraste dos tokens", () => {
  it("converte oklch para sRGB de forma reconhecível", () => {
    expect(parseOklch("oklch(0.76 0.16 151)")).toEqual({
      alpha: 1,
      chroma: 0.16,
      hue: 151,
      lightness: 0.76,
    });

    const white = oklchToRgb({ alpha: 1, chroma: 0, hue: 0, lightness: 1 });
    expect(white.r).toBeCloseTo(1, 2);
    expect(white.g).toBeCloseTo(1, 2);
    expect(white.b).toBeCloseTo(1, 2);

    // Referência conhecida: preto sobre branco é 21:1.
    expect(contrastRatio("oklch(0 0 0)", "oklch(1 0 0)")).toBeCloseTo(21, 0);
    expect(parseCssColor("#4F7CFF")).toEqual({ b: 1, g: 124 / 255, r: 79 / 255 });
  });

  it("lê os tokens de cada tema", () => {
    expect(lightTheme["wt-color-text-primary"]).toBeDefined();
    expect(darkTheme["wt-color-text-primary"]).not.toBe(lightTheme["wt-color-text-primary"]);
    expect(highContrastTheme["wt-color-background"]).toBeDefined();
  });

  for (const theme of themes) {
    it(`mantém texto em AA no tema ${theme.name}`, () => {
      const pairs = [
        ["wt-color-text-primary", "wt-color-background"],
        ["wt-color-text-primary", "wt-color-surface"],
        ["wt-color-text-primary", "wt-color-surface-elevated"],
        ["wt-color-text-secondary-strong", "wt-color-background"],
        ["wt-color-text-secondary-strong", "wt-color-surface"],
        // Texto de marca (rótulos, links) e texto de estado sobre o fundo e
        // sobre o próprio tom suave do estado (badges, alertas).
        ["wt-color-accent-text", "wt-color-surface"],
        ["wt-color-accent-text", "wt-color-accent-subtle"],
        ["wt-color-success-text", "wt-color-surface"],
        ["wt-color-success-text", "wt-color-success-subtle"],
        ["wt-color-warning-text", "wt-color-surface"],
        ["wt-color-warning-text", "wt-color-warning-subtle"],
        ["wt-color-danger-text", "wt-color-surface"],
        ["wt-color-danger-text", "wt-color-danger-subtle"],
        ["wt-color-info-text", "wt-color-surface"],
        ["wt-color-info-text", "wt-color-info-subtle"],
      ] as const;

      for (const [foreground, background] of pairs) {
        const ratio = contrastRatio(theme.colors[foreground], theme.colors[background]);
        expect(
          ratio,
          `${foreground} sobre ${background} no tema ${theme.name} ficou em ${ratio}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`mantém componentes e foco em AA (3:1) no tema ${theme.name}`, () => {
      const pairs = [
        ["wt-color-accent", "wt-color-background"],
        ["wt-color-accent", "wt-color-surface"],
        ["wt-color-accent-hover", "wt-color-background"],
        ["wt-color-accent-hover", "wt-color-surface"],
        ["wt-color-focus", "wt-color-background"],
        ["wt-color-focus", "wt-color-surface"],
        ["wt-color-danger", "wt-color-background"],
      ] as const;

      for (const [foreground, background] of pairs) {
        const ratio = contrastRatio(theme.colors[foreground], theme.colors[background]);
        expect(
          ratio,
          `${foreground} sobre ${background} no tema ${theme.name} ficou em ${ratio}:1`,
        ).toBeGreaterThanOrEqual(3);
      }
    });
  }

  it("mantém o texto do botão primário legível sobre a superfície de ação", () => {
    for (const theme of themes) {
      expect(
        contrastRatio(
          theme.colors["wt-color-accent-foreground"],
          theme.colors["wt-color-accent-hover"],
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("mantém o texto do botão destrutivo legível", () => {
    for (const theme of themes) {
      expect(
        contrastRatio(
          theme.colors["wt-color-danger-foreground"],
          theme.colors["wt-color-danger-strong"],
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
