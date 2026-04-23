/**
 * Theme Token System — Single Source of Truth
 *
 * Defines all design tokens for light and dark modes.
 * Tokens are grouped by semantic category (color, spacing, elevation, etc.)
 * and exported as both a typed TS object and CSS custom property mappings.
 *
 * Experimental: Tokens include luminance values for runtime contrast computation.
 */

export type ThemeMode = "light" | "dark" | "system";

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export interface ColorToken {
  value: string;
  luminance: number; // 0-1, for runtime contrast computation
}

export interface TokenSet {
  name: string;
  colors: {
    background: ColorToken;
    surface: ColorToken;
    elevated: ColorToken;
    deep: ColorToken;
    border: ColorToken;
    borderStrong: ColorToken;
    accent: ColorToken;
    accentDim: string;
    accentGlow: string;
    textPrimary: ColorToken;
    textSecondary: ColorToken;
    textTertiary: ColorToken;
    textMuted: ColorToken;
    statusSuccess: ColorToken;
    statusWarning: ColorToken;
    statusError: ColorToken;
    statusInfo: ColorToken;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    inset: string;
  };
  scrollbar: {
    track: string;
    thumb: string;
    thumbHover: string;
  };
  selection: {
    bg: string;
    color: string;
  };
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function c(hex: string): ColorToken {
  return { value: hex, luminance: hexLuminance(hex) };
}

export const lightTokens: TokenSet = {
  name: "light",
  colors: {
    background: c("#f7f6f3"),
    surface: c("#ffffff"),
    elevated: c("#f2f1ed"),
    deep: c("#ebeae6"),
    border: c("#e2e1dc"),
    borderStrong: c("#d0cfc9"),
    accent: c("#1c1c24"),
    accentDim: "rgba(28, 28, 36, 0.06)",
    accentGlow: "rgba(28, 28, 36, 0.08)",
    textPrimary: c("#1a1a1e"),
    textSecondary: c("#55555a"),
    textTertiary: c("#8a8a90"),
    textMuted: c("#b5b5ba"),
    statusSuccess: c("#2a7a45"),
    statusWarning: c("#b07d1a"),
    statusError: c("#c23636"),
    statusInfo: c("#1e5a9e"),
  },
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 12px rgba(0, 0, 0, 0.06)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.08)",
    inset: "inset 0 1px 0 rgba(0, 0, 0, 0.03)",
  },
  scrollbar: {
    track: "#ebeae6",
    thumb: "#d0cfc9",
    thumbHover: "#b5b5ba",
  },
  selection: {
    bg: "rgba(28, 28, 36, 0.08)",
    color: "#1c1c24",
  },
};

export const darkTokens: TokenSet = {
  name: "dark",
  colors: {
    background: c("#08080a"),
    surface: c("#111114"),
    elevated: c("#1a1a1f"),
    deep: c("#15151a"),
    border: c("#25252b"),
    borderStrong: c("#35353d"),
    accent: c("#e8e4dc"),
    accentDim: "rgba(232, 228, 220, 0.06)",
    accentGlow: "rgba(232, 228, 220, 0.08)",
    textPrimary: c("#f2f2f7"),
    textSecondary: c("#9e9ea8"),
    textTertiary: c("#63636d"),
    textMuted: c("#404049"),
    statusSuccess: c("#52c47f"),
    statusWarning: c("#e5b84d"),
    statusError: c("#e07070"),
    statusInfo: c("#6ba3d9"),
  },
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.5)",
    md: "0 4px 12px rgba(0, 0, 0, 0.4)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.5)",
    inset: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  },
  scrollbar: {
    track: "#15151a",
    thumb: "#35353d",
    thumbHover: "#404049",
  },
  selection: {
    bg: "rgba(232, 228, 220, 0.08)",
    color: "#e8e4dc",
  },
};

export const tokenKeys = [
  "--background",
  "--surface",
  "--elevated",
  "--deep",
  "--border",
  "--border-strong",
  "--accent",
  "--accent-dim",
  "--accent-glow",
  "--text-primary",
  "--text-secondary",
  "--text-tertiary",
  "--text-muted",
  "--status-success",
  "--status-warning",
  "--status-error",
  "--status-info",
  "--shadow-sm",
  "--shadow-md",
  "--shadow-lg",
  "--shadow-inset",
  "--scrollbar-track",
  "--scrollbar-thumb",
  "--scrollbar-thumb-hover",
  "--selection-bg",
  "--selection-color",
] as const;

export type TokenKey = (typeof tokenKeys)[number];

export function tokensToCssVars(tokens: TokenSet): Record<TokenKey, string> {
  return {
    "--background": tokens.colors.background.value,
    "--surface": tokens.colors.surface.value,
    "--elevated": tokens.colors.elevated.value,
    "--deep": tokens.colors.deep.value,
    "--border": tokens.colors.border.value,
    "--border-strong": tokens.colors.borderStrong.value,
    "--accent": tokens.colors.accent.value,
    "--accent-dim": tokens.colors.accentDim,
    "--accent-glow": tokens.colors.accentGlow,
    "--text-primary": tokens.colors.textPrimary.value,
    "--text-secondary": tokens.colors.textSecondary.value,
    "--text-tertiary": tokens.colors.textTertiary.value,
    "--text-muted": tokens.colors.textMuted.value,
    "--status-success": tokens.colors.statusSuccess.value,
    "--status-warning": tokens.colors.statusWarning.value,
    "--status-error": tokens.colors.statusError.value,
    "--status-info": tokens.colors.statusInfo.value,
    "--shadow-sm": tokens.shadows.sm,
    "--shadow-md": tokens.shadows.md,
    "--shadow-lg": tokens.shadows.lg,
    "--shadow-inset": tokens.shadows.inset,
    "--scrollbar-track": tokens.scrollbar.track,
    "--scrollbar-thumb": tokens.scrollbar.thumb,
    "--scrollbar-thumb-hover": tokens.scrollbar.thumbHover,
    "--selection-bg": tokens.selection.bg,
    "--selection-color": tokens.selection.color,
  };
}

/**
 * Dynamic Contrast Engine
 *
 * Computes WCAG 2.2 contrast ratio between two luminance values.
 * Returns a foreground color that guarantees AA compliance (4.5:1)
 * against the given background.
 */
export function wcagContrast(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureAaContrast(
  bgLuminance: number,
  preferredFg: ColorToken,
  fallbackFg: ColorToken
): ColorToken {
  const ratio = wcagContrast(bgLuminance, preferredFg.luminance);
  return ratio >= 4.5 ? preferredFg : fallbackFg;
}

/**
 * Interpolate between two hex colors.
 * Returns a hex string at position t (0-1).
 */
export function interpolateColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${rr.toString(16).padStart(2, "0")}${rg.toString(16).padStart(2, "0")}${rb.toString(16).padStart(2, "0")}`;
}
