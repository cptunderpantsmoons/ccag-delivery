export interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "neutral";
  label: string;
  size?: "sm" | "md";
  dot?: boolean;
}

const badgeClassByStatus: Record<StatusBadgeProps["status"], string> = {
  success: "badge badge-success",
  warning: "badge badge-warning",
  error: "badge badge-error",
  info: "badge badge-info",
  neutral: "badge badge-neutral",
};

const dotColorByStatus: Record<StatusBadgeProps["status"], string> = {
  success: "bg-[var(--status-success)]",
  warning: "bg-[var(--status-warning)]",
  error: "bg-[var(--status-error)]",
  info: "bg-[var(--status-info)]",
  neutral: "bg-[var(--text-tertiary)]",
};

export function StatusBadge({
  status,
  label,
  size = "md",
  dot = true,
}: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "text-[0.6rem] py-[2px] px-[6px] gap-[3px]" : "";

  return (
    <span className={`${badgeClassByStatus[status]} ${sizeClasses}`}>
      {dot && (
        <span
          className={`inline-block h-[5px] w-[5px] shrink-0 rounded-full ${dotColorByStatus[status]}`}
        />
      )}
      {label}
    </span>
  );
}
