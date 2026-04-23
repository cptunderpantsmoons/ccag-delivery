/**
 * Theme Transition Telemetry
 *
 * Logs performance metrics, memory deltas, and user toggle frequency.
 * Uses a lightweight in-memory ring buffer + localStorage snapshot.
 */

export interface TransitionMetrics {
  id: string;
  from: string;
  to: string;
  durationMs: number;
  frameDrops: number;
  maxFrameTimeMs: number;
  memoryDeltaMb: number | null;
  timestamp: number;
  engine: "css" | "raf" | "worker";
  succeeded: boolean;
  failureReason?: string;
}

const STORAGE_KEY = "carbon-theme-telemetry";
const MAX_BUFFER = 50;

class TelemetryRing {
  private buffer: TransitionMetrics[] = [];

  push(entry: TransitionMetrics) {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.shift();
    }
    this.persist();
  }

  getAll(): TransitionMetrics[] {
    return [...this.buffer];
  }

  getAverageDuration(): number {
    if (this.buffer.length === 0) return 0;
    return this.buffer.reduce((s, m) => s + m.durationMs, 0) / this.buffer.length;
  }

  getDropRate(): number {
    if (this.buffer.length === 0) return 0;
    const total = this.buffer.reduce((s, m) => s + m.frameDrops, 0);
    const frames = this.buffer.reduce((s, m) => s + Math.max(1, Math.round(m.durationMs / 16)), 0);
    return total / Math.max(1, frames);
  }

  getFailureCount(): number {
    return this.buffer.filter((m) => !m.succeeded).length;
  }

  recommendEngine(): "css" | "raf" | "worker" {
    const recent = this.buffer.slice(-5);
    if (recent.length < 2) return "raf";
    const avgDrop = recent.reduce((s, m) => s + m.frameDrops, 0) / recent.length;
    const avgDuration = recent.reduce((s, m) => s + m.durationMs, 0) / recent.length;
    if (avgDrop > 3 || avgDuration > 120) return "css";
    return "raf";
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer));
    } catch {
      // Storage quota exceeded
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TransitionMetrics[];
        this.buffer = parsed.slice(-MAX_BUFFER);
      }
    } catch {
      this.buffer = [];
    }
  }
}

export const themeTelemetry = new TelemetryRing();

if (typeof window !== "undefined") {
  themeTelemetry.load();
}

export function captureMemoryDelta(): number | null {
  const perf = performance as typeof performance & {
    memory?: { usedJSHeapSize: number };
  };
  if (perf.memory) {
    return perf.memory.usedJSHeapSize / (1024 * 1024);
  }
  return null;
}

export function logTransition(metrics: Omit<TransitionMetrics, "id" | "timestamp">) {
  const entry: TransitionMetrics = {
    ...metrics,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  themeTelemetry.push(entry);
  console.log(
    `[ThemeTelemetry] ${entry.succeeded ? "OK" : "FAIL"} ${entry.engine} ${entry.from}->${entry.to} in ${entry.durationMs.toFixed(1)}ms (drops=${entry.frameDrops})`
  );
  return entry;
}
