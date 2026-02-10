'use client';

import { ButtonHTMLAttributes, useRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { soundEngine } from '@/lib/sounds';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface RippleState {
  x: number;
  y: number;
  id: number;
}

interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<'button'>> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-neon text-surface font-semibold shadow-neon active:shadow-neon-strong',
  secondary:
    'bg-surface-3 text-text-primary border border-border-subtle active:bg-surface-4',
  danger:
    'bg-danger/15 text-danger border border-danger/20 active:bg-danger/25',
  ghost:
    'bg-transparent text-text-secondary active:bg-surface-3',
};

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 text-sm rounded-xl gap-2',
  lg: 'min-h-[52px] px-6 text-base rounded-xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const nextId = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((prev) => [
      ...prev,
      { x: e.clientX - rect.left, y: e.clientY - rect.top, id },
    ]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    soundEngine.tap();
    onClick?.(e);
  };

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden font-body',
        'select-none transition-colors duration-150',
        'disabled:opacity-40 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/20 animate-[ripple_0.6s_ease-out_forwards] pointer-events-none"
          style={{
            left: ripple.x - 40,
            top: ripple.y - 40,
            width: 80,
            height: 80,
          }}
        />
      ))}

      {/* Spinner */}
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}

      <span className={cn('relative z-10', loading && 'opacity-70')}>
        {children}
      </span>
    </motion.button>
  );
}
