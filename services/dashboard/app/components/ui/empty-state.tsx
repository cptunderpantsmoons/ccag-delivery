import Link from "next/link";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const actionButton = action ? (
    action.href ? (
      <Link
        href={action.href}
        className="carbon-button carbon-button-primary"
      >
        {action.label}
      </Link>
    ) : (
      <button
        type="button"
        onClick={action.onClick}
        className="carbon-button carbon-button-primary"
      >
        {action.label}
      </button>
    )
  ) : null;

  return (
    <div className="flex flex-col items-center justify-center gap-[var(--space-lg)] py-[var(--space-3xl)] text-center">
      {icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--deep)] text-[var(--text-tertiary)]">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-[var(--space-xs)]">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="mx-auto max-w-[50ch] text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {actionButton}
    </div>
  );
}
