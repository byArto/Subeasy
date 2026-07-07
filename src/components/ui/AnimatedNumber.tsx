'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Format the interpolated number for display. Default: rounded, ru-RU grouped. */
  format?: (n: number) => string;
  /** Animation length in seconds. */
  duration?: number;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('ru-RU');

/**
 * Counts a number up the first time it scrolls into view, then smoothly
 * re-counts from the old value to the new one whenever `value` changes.
 *
 * Isolated leaf component on purpose: the per-frame `setState` re-renders only
 * this <span>, never the parent (see react-best-practices — keep fast-updating
 * state at the leaves). Honors prefers-reduced-motion (jumps straight to value).
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 0.8,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();

  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0); // where the next run starts (last settled value)
  const startedRef = useRef(false); // has the first count-up begun?

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    // Hold at 0 until the number is actually on screen for its first reveal.
    if (!startedRef.current && !inView) return;

    const from = startedRef.current ? fromRef.current : 0;
    startedRef.current = true;

    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1], // easeOutQuint — fast start, gentle settle
      onUpdate: (v) => setDisplay(v),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, duration]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
