'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Buttons — spec: Geist Sans 14px/600, pill radius (rounded-full), transition 300ms
 * ease-[cubic-bezier(0.32,0.72,0,1)], active:scale-[0.98]. Icon variant is 0.5rem radius square.
 * Dark theme for Carbon Void design system.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
        secondary:
          'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--deep)]',
        ghost: 'text-[var(--text-primary)] hover:bg-[var(--deep)]',
        destructive: 'bg-[var(--status-error)] text-white hover:bg-[#ef4444]',
        outline_accent:
          'border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white',
        icon: 'text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--deep)]',
      },
      size: {
        sm: 'h-8 rounded-full px-3 text-[0.8125rem]',
        md: 'h-10 rounded-full px-5 text-[0.875rem]',
        lg: 'h-11 rounded-full px-6 text-[0.9375rem]',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    compoundVariants: [
      { variant: 'icon', size: 'md', className: 'h-9 w-9 rounded-lg p-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
