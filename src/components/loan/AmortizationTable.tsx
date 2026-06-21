'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScheduleRow } from '@/lib/loanUtils';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface AmortizationTableProps {
  rows: ScheduleRow[];
  currencySymbol: string;
}

const INITIAL_ROWS = 3;

function formatDate(iso: string, lang: string): string {
  const date = new Date(iso);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export function AmortizationTable({ rows, currencySymbol }: AmortizationTableProps) {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, INITIAL_ROWS);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_1fr_1fr] gap-x-2 px-1 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
        <span>#</span>
        <span>{lang === 'en' ? 'Date' : 'Дата'}</span>
        <span className="text-right">{lang === 'en' ? 'Payment' : 'Платёж'}</span>
        <span className="text-right">{lang === 'en' ? 'Balance' : 'Остаток'}</span>
      </div>

      <AnimatePresence initial={false}>
        {visible.map((row) => (
          <motion.div
            key={row.index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'grid grid-cols-[32px_1fr_1fr_1fr] gap-x-2 px-3 py-2.5 rounded-xl text-[13px]',
              row.index % 2 === 0 ? 'bg-surface-2' : 'bg-surface-3'
            )}
          >
            <span className="text-text-muted font-mono">{row.index}</span>
            <span className="text-text-secondary">{formatDate(row.date, lang)}</span>
            <span className="text-right text-text font-medium tabular-nums">
              {fmt(row.payment)}<span className="text-text-muted text-[11px]"> {currencySymbol}</span>
            </span>
            <span className="text-right text-text-secondary tabular-nums">
              {fmt(row.balance)}<span className="text-text-muted text-[11px]"> {currencySymbol}</span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {rows.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[13px] font-semibold text-neon py-2 text-center w-full"
        >
          {expanded
            ? (lang === 'en' ? '▲ Collapse' : '▲ Свернуть')
            : (lang === 'en' ? `▼ Show all ${rows.length} payments` : `▼ Показать все ${rows.length} платежей`)}
        </button>
      )}
    </div>
  );
}
