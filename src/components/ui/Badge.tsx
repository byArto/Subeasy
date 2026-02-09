'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-neon/10 text-neon border-neon/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  neutral: 'bg-surface-4 text-text-secondary border-border-subtle',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-neon',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-text-muted',
};

export function Badge({
  variant = 'neutral',
  children,
  pulse = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2.5 py-1 rounded-full',
        'text-[11px] font-semibold leading-none tracking-wide uppercase',
        'border',
        variantStyles[variant],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              dotColors[variant]
            )}
          />
          <span
            className={cn(
              'relative inline-flex h-1.5 w-1.5 rounded-full',
              dotColors[variant]
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
