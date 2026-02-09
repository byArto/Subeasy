'use client';

import { InputHTMLAttributes, useState, useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
  className,
  value,
  defaultValue,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined ? String(value).length > 0 : false;
  const isFloating = focused || hasValue || !!defaultValue;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className={cn(
          'relative flex items-center rounded-xl border transition-all duration-200',
          'bg-surface-2',
          focused
            ? 'border-neon/40 shadow-[0_0_12px_rgba(0,255,65,0.1)]'
            : error
              ? 'border-danger/40'
              : 'border-border-subtle'
        )}
      >
        {/* Left icon */}
        {icon && (
          <span className="pl-3.5 text-text-muted shrink-0">{icon}</span>
        )}

        <div className="relative flex-1 min-h-[52px]">
          {/* Floating label */}
          <motion.label
            htmlFor={id}
            animate={{
              y: isFloating ? -10 : 0,
              scale: isFloating ? 0.75 : 1,
              color: focused
                ? '#00FF41'
                : error
                  ? '#FF4444'
                  : '#8888A0',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 origin-left',
              'text-sm pointer-events-none select-none',
              icon ? 'pl-0' : 'pl-3.5'
            )}
          >
            {label}
          </motion.label>

          {/* Input */}
          <input
            id={id}
            value={value}
            defaultValue={defaultValue}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={cn(
              'w-full h-[52px] bg-transparent text-text-primary text-sm',
              'outline-none appearance-none',
              'pt-3',
              icon ? 'pl-2' : 'pl-3.5',
              'pr-3.5',
              '[&::-webkit-inner-spin-button]:appearance-none',
              '[&::-webkit-calendar-picker-indicator]:invert',
              '[&::-webkit-calendar-picker-indicator]:opacity-50'
            )}
            style={{ WebkitAppearance: 'none' }}
            {...props}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 pl-1 text-xs text-danger"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
