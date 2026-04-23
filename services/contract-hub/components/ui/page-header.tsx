import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /**
   * Optional eyebrow label. Displayed inside a pill with a pulsing emerald dot.
   * Only use when the page genuinely represents live/streaming data.
   */
  eyebrow?: string;
  /**
   * When true, the eyebrow dot pulses. Defaults to true only when eyebrow is set.
   */
  liveIndicator?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  liveIndicator = true,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
        className
      )}
    >
      <div>
        {eyebrow ? (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full bg-[var(--accent)]',
                liveIndicator && 'animate-pulse'
              )}
            />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              {eyebrow}
            </span>
          </div>
        ) : null}
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.1] tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[60ch] text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}
