"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { type ThemeMode, resolveMode } from "./tokens";
import { applyTheme, applyThemeCss } from "./engine";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "carbon-theme-mode";

function getStoredMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  } catch {
    return null;
  }
}

function storeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = "system" }: ThemeProviderProps) {
  const initialMode = getStoredMode() ?? defaultMode;
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [resolved, setResolved] = useState<"light" | "dark">(resolveMode(initialMode));
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync with system preference changes
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const next = e.matches ? "dark" : "light";
      setResolved(next);
      applyThemeCss(next);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback(
    async (next: ThemeMode) => {
      if (next === mode) return;
      const from = resolveMode(mode);
      const to = resolveMode(next);
      setModeState(next);
      storeMode(next);
      setResolved(to);

      if (from !== to) {
        setIsTransitioning(true);
        await applyTheme(from, to);
        setIsTransitioning(false);
      }
    },
    [mode]
  );

  const toggle = useCallback(() => {
    const next = resolved === "dark" ? "light" : "dark";
    setMode(next);
  }, [resolved, setMode]);

  const value = { mode, resolved, setMode, toggle, isTransitioning };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
