/**
 * Theme Token System — Single Source of Truth
 *
 * Defines all design tokens for light and dark modes.
 * Contract Hub variant preserves emerald brand identity.
 */

export type ThemeMode = "light" | "dark" | "system";

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export interface ColorToken {
  value: string;
  luminance: number;
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
    background: c("#f8f9fb"),
    surface: c("#ffffff"),
    elevated: c("#f1f3f5"),
    deep: c("#e9ecef"),
    border: c("#dee2e6"),
    borderStrong: c("#ced4da"),
    accent: c("#059669"),
    accentDim: "rgba(5, 150, 105, 0.08)",
    accentGlow: "rgba(5, 150, 105, 0.12)",
    textPrimary: c("#1a1a2e"),
    textSecondary: c("#495057"),
    textTertiary: c("#868e96"),
    textMuted: c("#adb5bd"),
    statusSuccess: c("#2b8a3e"),
    statusWarning: c("#e67700"),
    statusError: c("#c92a2a"),
    statusInfo: c("#1864ab"),
  },
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    inset: "inset 0 1px 0 rgba(0, 0, 0, 0.04)",
  },
  scrollbar: {
    track: "#e9ecef",
    thumb: "#ced4da",
    thumbHover: "#adb5bd",
  },
  selection: {
    bg: "rgba(5, 150, 105, 0.12)",
    color: "#1a1a2e",
  },
};

export const darkTokens: TokenSet = {
  name: "dark",
  colors: {
    background: c("#0a0a0b"),
    surface: c("#131315"),
    elevated: c("#1f1f23"),
    deep: c("#1a1a1d"),
    border: c("#2a2a2e"),
    borderStrong: c("#3a3a3e"),
    accent: c("#10B981"),
    accentDim: "rgba(16, 185, 129, 0.1)",
    accentGlow: "rgba(16, 185, 129, 0.15)",
    textPrimary: c("#f0f0f5"),
    textSecondary: c("#a0a0ab"),
    textTertiary: c("#6b6b78"),
    textMuted: c("#4a4a52"),
    statusSuccess: c("#4ade80"),
    statusWarning: c("#facc15"),
    statusError: c("#f87171"),
    statusInfo: c("#6ba8e8"),
  },
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.6)",
    inset: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  },
  scrollbar: {
    track: "#1a1a1d",
    thumb: "#3a3a3e",
    thumbHover: "#4a4a52",
  },
  selection: {
    bg: "rgba(16, 185, 129, 0.2)",
    color: "#f0f0f5",
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
