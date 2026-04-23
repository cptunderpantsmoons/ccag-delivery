import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-[var(--space-md)] mb-[var(--space-2xl)]">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-[var(--text-muted)]">/</span>}
                {isLast || !crumb.href ? (
                  <span className={`font-medium ${isLast ? "text-[var(--text-secondary)]" : ""}`}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="font-medium transition-colors duration-[var(--duration-fast)] hover:text-[var(--text-primary)]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-start sm:justify-between sm:gap-[var(--space-md)]">
        <div className="flex flex-col gap-[var(--space-xs)]">
          <h1 className="editorial-heading text-[1.75rem] leading-[1.1] tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] max-w-[55ch]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-[var(--space-sm)]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
