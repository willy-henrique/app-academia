/**
 * Auditoria automática de contraste (WCAG 2.2). Converte os tokens em `oklch`
 * para sRGB e calcula a razão de contraste, para que uma mudança de cor que
 * quebre a acessibilidade falhe no teste em vez de chegar ao usuário.
 */

export type Oklch = Readonly<{ alpha: number; chroma: number; hue: number; lightness: number }>;

export type Rgb = Readonly<{ b: number; g: number; r: number }>;

const oklchPattern = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i;
const hexPattern = /^#([\da-f]{3}|[\da-f]{6})$/i;

export function parseOklch(value: string): Oklch | null {
  const match = oklchPattern.exec(value.trim());

  if (!match) {
    return null;
  }

  return {
    alpha: match[4] === undefined ? 1 : Number(match[4]),
    chroma: Number(match[2]),
    hue: Number(match[3]),
    lightness: Number(match[1]),
  };
}

function gammaEncode(channel: number): number {
  const clamped = Math.max(0, Math.min(1, channel));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

/** OKLCh → OKLab → sRGB linear → sRGB (0–1). */
export function oklchToRgb(color: Oklch): Rgb {
  const hueRadians = (color.hue * Math.PI) / 180;
  const a = color.chroma * Math.cos(hueRadians);
  const b = color.chroma * Math.sin(hueRadians);

  const l = (color.lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (color.lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (color.lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    b: gammaEncode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    g: gammaEncode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    r: gammaEncode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
  };
}

export function parseCssColor(value: string): Rgb | null {
  const oklch = parseOklch(value);
  if (oklch) {
    return oklchToRgb(oklch);
  }

  const hex = hexPattern.exec(value.trim());
  if (!hex) {
    return null;
  }

  const normalized =
    hex[1].length === 3
      ? hex[1]
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : hex[1];

  return {
    b: Number.parseInt(normalized.slice(4, 6), 16) / 255,
    g: Number.parseInt(normalized.slice(2, 4), 16) / 255,
    r: Number.parseInt(normalized.slice(0, 2), 16) / 255,
  };
}

function linearize(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Rgb): number {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

export function contrastRatio(foreground: string, background: string): number {
  const parsedForeground = parseCssColor(foreground);
  const parsedBackground = parseCssColor(background);

  if (!parsedForeground || !parsedBackground) {
    throw new Error(`Cor não reconhecida: ${foreground} / ${background}`);
  }

  const foregroundLuminance = relativeLuminance(parsedForeground);
  const backgroundLuminance = relativeLuminance(parsedBackground);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export type ThemeColors = Readonly<Record<string, string>>;

/** Lê os tokens de cor de um bloco CSS (`:root`, `[data-theme=...]`, ...). */
export function readThemeColors(css: string, selector: string): ThemeColors {
  const blockPattern = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\{([^}]*)\\}`,
    "m",
  );
  const block = blockPattern.exec(css);

  if (!block) {
    return {};
  }

  const colors: Record<string, string> = {};
  const declarationPattern = /--(wt-color-[\w-]+)\s*:\s*([^;]+);/g;
  let declaration: RegExpExecArray | null;

  while ((declaration = declarationPattern.exec(block[1])) !== null) {
    colors[declaration[1]] = declaration[2].trim();
  }

  return colors;
}
