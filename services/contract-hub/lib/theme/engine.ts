/**
 * Theme Transition Engine
 *
 * Three modes: CSS instant, rAF interpolation, Web Worker offload.
 * Auto-degrades on frame drop threshold.
 */

import {
  lightTokens,
  darkTokens,
  tokensToCssVars,
  interpolateColor,
  type TokenSet,
  type TokenKey,
  type ThemeMode,
} from "./tokens";
import { logTransition, captureMemoryDelta, themeTelemetry } from "./telemetry";

const TRANSITION_DURATION = 400;
const FRAME_BUDGET = 16;
const DROP_THRESHOLD = 3;

let currentEngine: "css" | "raf" | "worker" = "raf";

export function getRecommendedEngine(): "css" | "raf" | "worker" {
  return themeTelemetry.recommendEngine();
}

export function setEngine(engine: "css" | "raf" | "worker") {
  currentEngine = engine;
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function getTokenSet(mode: "light" | "dark"): TokenSet {
  return mode === "light" ? lightTokens : darkTokens;
}

export function applyThemeCss(mode: "light" | "dark") {
  const root = document.documentElement;
  const vars = tokensToCssVars(getTokenSet(mode));
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", mode);
}

export function applyThemeRaf(fromMode: "light" | "dark", toMode: "light" | "dark") {
  return new Promise<void>((resolve, reject) => {
    const root = document.documentElement;
    const fromVars = tokensToCssVars(getTokenSet(fromMode));
    const toVars = tokensToCssVars(getTokenSet(toMode));
    const keys = Object.keys(fromVars) as TokenKey[];

    let frameDrops = 0;
    let maxFrameTime = 0;
    const startTime = performance.now();
    const memBefore = captureMemoryDelta();
    let rafId = 0;
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / TRANSITION_DURATION);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const frameStart = performance.now();

      for (const key of keys) {
        const a = fromVars[key];
        const b = toVars[key];
        if (a.startsWith("#") && b.startsWith("#") && a.length === 7 && b.length === 7) {
          root.style.setProperty(key, interpolateColor(a, b, eased));
        } else if (a.startsWith("rgba") && b.startsWith("rgba")) {
          root.style.setProperty(key, b);
        } else {
          root.style.setProperty(key, t >= 0.5 ? b : a);
        }
      }

      const frameTime = performance.now() - frameStart;
      maxFrameTime = Math.max(maxFrameTime, frameTime);
      if (frameTime > FRAME_BUDGET) frameDrops++;

      if (t < 1 && frameDrops < DROP_THRESHOLD + 2) {
        rafId = requestAnimationFrame(tick);
      } else {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        keys.forEach((k) => root.style.setProperty(k, toVars[k]));
        root.setAttribute("data-theme", toMode);

        const memAfter = captureMemoryDelta();
        logTransition({
          from: fromMode,
          to: toMode,
          durationMs: performance.now() - startTime,
          frameDrops,
          maxFrameTimeMs: maxFrameTime,
          memoryDeltaMb: memBefore && memAfter ? memAfter - memBefore : null,
          engine: "raf",
          succeeded: frameDrops < DROP_THRESHOLD + 2,
          failureReason: frameDrops >= DROP_THRESHOLD + 2 ? "excessive_frame_drops" : undefined,
        });

        if (frameDrops >= DROP_THRESHOLD + 2) {
          currentEngine = "css";
          reject(new Error(`Frame drops exceeded threshold (${frameDrops})`));
        } else {
          resolve();
        }
      }
    }

    rafId = requestAnimationFrame(tick);

    timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(rafId);
      keys.forEach((k) => root.style.setProperty(k, toVars[k]));
      root.setAttribute("data-theme", toMode);
      logTransition({
        from: fromMode,
        to: toMode,
        durationMs: TRANSITION_DURATION + 100,
        frameDrops,
        maxFrameTimeMs: maxFrameTime,
        memoryDeltaMb: null,
        engine: "raf",
        succeeded: false,
        failureReason: "safety_timeout",
      });
      reject(new Error("Transition safety timeout"));
    }, TRANSITION_DURATION + 100);
  });
}

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob(
      [
        `
        self.onmessage = function(e) {
          const { keys, fromVars, toVars, duration, startTime } = e.data;
          const results = [];
          function tick(now) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            const frame = {};
            for (const key of keys) {
              const a = fromVars[key];
              const b = toVars[key];
              if (a.startsWith('#') && b.startsWith('#') && a.length === 7 && b.length === 7) {
                const ar = parseInt(a.slice(1,3), 16), ag = parseInt(a.slice(3,5), 16), ab = parseInt(a.slice(5,7), 16);
                const br = parseInt(b.slice(1,3), 16), bg = parseInt(b.slice(3,5), 16), bb = parseInt(b.slice(5,7), 16);
                const rr = Math.round(ar + (br - ar) * eased);
                const rg = Math.round(ag + (bg - ag) * eased);
                const rb = Math.round(ab + (bb - ab) * eased);
                frame[key] = '#' + rr.toString(16).padStart(2,'0') + rg.toString(16).padStart(2,'0') + rb.toString(16).padStart(2,'0');
              } else {
                frame[key] = t >= 0.5 ? b : a;
              }
            }
            results.push(frame);
            if (t < 1) {
              requestAnimationFrame(tick);
            } else {
              self.postMessage({ done: true, frames: results });
            }
          }
          requestAnimationFrame(tick);
        };
        `,
      ],
      { type: "application/javascript" }
    );
    worker = new Worker(URL.createObjectURL(blob));
  }
  return worker;
}

export function applyThemeWorker(fromMode: "light" | "dark", toMode: "light" | "dark") {
  return new Promise<void>((resolve, reject) => {
    const root = document.documentElement;
    const fromVars = tokensToCssVars(getTokenSet(fromMode));
    const toVars = tokensToCssVars(getTokenSet(toMode));
    const keys = Object.keys(fromVars) as TokenKey[];
    const startTime = performance.now();
    const memBefore = captureMemoryDelta();

    const w = getWorker();
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      w.onmessage = null;
      w.onerror = null;
      reject(new Error("Worker transition safety timeout"));
    }, TRANSITION_DURATION + 150);

    w.onmessage = (e) => {
      if (settled) return;
      if (e.data.done) {
        settled = true;
        clearTimeout(timeoutId);
        w.onmessage = null;
        w.onerror = null;
        keys.forEach((k) => root.style.setProperty(k, toVars[k]));
        root.setAttribute("data-theme", toMode);

        const memAfter = captureMemoryDelta();
        logTransition({
          from: fromMode,
          to: toMode,
          durationMs: performance.now() - startTime,
          frameDrops: 0,
          maxFrameTimeMs: 0,
          memoryDeltaMb: memBefore && memAfter ? memAfter - memBefore : null,
          engine: "worker",
          succeeded: true,
        });
        resolve();
      }
    };
    w.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      w.onmessage = null;
      w.onerror = null;
      reject(new Error("Worker transition failed"));
    };

    w.postMessage({ keys, fromVars, toVars, duration: TRANSITION_DURATION, startTime });
  });
}

export async function applyTheme(
  fromMode: "light" | "dark",
  toMode: "light" | "dark",
  preferredEngine?: "css" | "raf" | "worker"
) {
  if (fromMode === toMode) return;

  const engine = preferredEngine ?? currentEngine ?? getRecommendedEngine();
  const root = document.documentElement;
  root.style.setProperty("transition", "none");

  try {
    if (engine === "worker") {
      await applyThemeWorker(fromMode, toMode);
    } else if (engine === "raf") {
      await applyThemeRaf(fromMode, toMode);
    } else {
      applyThemeCss(toMode);
      logTransition({
        from: fromMode,
        to: toMode,
        durationMs: 0,
        frameDrops: 0,
        maxFrameTimeMs: 0,
        memoryDeltaMb: null,
        engine: "css",
        succeeded: true,
      });
    }
  } catch (err) {
    applyThemeCss(toMode);
    logTransition({
      from: fromMode,
      to: toMode,
      durationMs: 0,
      frameDrops: 0,
      maxFrameTimeMs: 0,
      memoryDeltaMb: null,
      engine: "css",
      succeeded: true,
      failureReason: `degraded_from_${engine}: ${err instanceof Error ? err.message : String(err)}`,
    });
  } finally {
    root.style.removeProperty("transition");
  }
}
