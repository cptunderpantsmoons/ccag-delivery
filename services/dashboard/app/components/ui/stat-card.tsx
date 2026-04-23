import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "featured";
}

export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  variant = "default",
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-[var(--status-success)]"
      : trend === "down"
        ? "text-[var(--status-error)]"
        : "text-[var(--text-tertiary)]";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const isFeatured = variant === "featured";

  return (
    <div
      className={`group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-lg)] transition-all duration-[var(--duration-normal)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] ${
        isFeatured ? "lg:col-span-2" : ""
      }`}
    >
      {/* Subtle accent line for featured */}
      {isFeatured && (
        <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-[var(--accent)] to-transparent opacity-40" />
      )}

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-[var(--space-xs)]">
          <span className="label-mono">{label}</span>
          <span
            className={`font-semibold tracking-tight text-[var(--text-primary)] ${
              isFeatured ? "text-4xl" : "text-3xl"
            }`}
          >
            {value}
          </span>
        </div>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--deep)] text-[var(--text-tertiary)] transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--text-secondary)]">
            {icon}
          </span>
        )}
      </div>

      {(trend || trendLabel) && (
        <div className="mt-[var(--space-sm)] flex items-center gap-[var(--space-xs)]">
          {trend && <TrendIcon size={14} strokeWidth={1.5} className={trendColor} />}
          {trendLabel && (
            <span className={`text-xs font-medium ${trendColor}`}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
