import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Status Pill — spec: Geist Mono, uppercase, 0.05em tracking, 0.6875rem, rounded-full.
 * Dark theme variants for Carbon Void design system.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] tabular-nums',
  {
    variants: {
      variant: {
        completed: 'bg-[rgba(74,222,128,0.1)] text-[var(--status-success)]',
        in_progress: 'bg-[rgba(107,168,232,0.1)] text-[var(--status-info)]',
        pending: 'bg-[rgba(250,204,21,0.1)] text-[var(--status-warning)]',
        rejected: 'bg-[rgba(248,113,113,0.1)] text-[var(--status-error)]',
        neutral: 'bg-[var(--deep)] text-[var(--text-secondary)]',
        muted: 'bg-[var(--background)] text-[var(--text-tertiary)]',
        accent: 'bg-[var(--accent-dim)] text-[var(--accent)]',
        delta_up: 'bg-[rgba(74,222,128,0.1)] text-[var(--status-success)]',
        delta_down: 'bg-[rgba(248,113,113,0.1)] text-[var(--status-error)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean;
}

export function Badge({ className, variant, withDot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {withDot ? (
        <span
          className={cn(
            'h-1 w-1 rounded-full',
            variant === 'completed' || variant === 'accent' || variant === 'delta_up'
              ? 'bg-[var(--status-success)]'
              : variant === 'in_progress'
                ? 'bg-[var(--status-info)]'
                : variant === 'pending'
                  ? 'bg-[var(--status-warning)]'
                  : variant === 'rejected' || variant === 'delta_down'
                    ? 'bg-[var(--status-error)]'
                    : 'bg-[var(--text-secondary)]'
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Map any free-form status string to the canonical Badge variant.
 * Unknown values fall through to `neutral`.
 */
export function statusToBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (['completed', 'approved', 'signed', 'active'].includes(s)) return 'completed';
  if (['in_progress', 'open', 'review', 'pending_review'].includes(s)) return 'in_progress';
  if (['pending', 'pending_approval', 'draft'].includes(s)) return 'pending';
  if (['rejected', 'expired', 'terminated', 'cancelled'].includes(s)) return 'rejected';
  if (['closed', 'archived', 'on_hold'].includes(s)) return 'muted';
  if (['negotiation', 'high'].includes(s)) return 'pending';
  if (['critical'].includes(s)) return 'rejected';
  return 'neutral';
}
