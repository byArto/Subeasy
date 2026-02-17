'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  addMonths,
  subMonths,
  format,
  getDay,
  addWeeks,
} from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { Subscription, AppSettings, Currency } from '@/lib/types';
import { convertCurrency, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { soundEngine } from '@/lib/sounds';
import { useLanguage } from '@/components/providers/LanguageProvider';

/* ── Props ── */

interface CalendarPageProps {
  subscriptions: Subscription[];
  settings: AppSettings;
  onSubTap?: (sub: Subscription) => void;
}

/* ── Translation keys ── */

const MONTH_FULL_KEYS = [
  'month.full.jan', 'month.full.feb', 'month.full.mar', 'month.full.apr',
  'month.full.may', 'month.full.jun', 'month.full.jul', 'month.full.aug',
  'month.full.sep', 'month.full.oct', 'month.full.nov', 'month.full.dec',
];

// Mon–Sun order (for weekday header row, weekStartsOn=1)
const WEEKDAY_KEYS = [
  'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun',
];

// Indexed by getDay() result: 0=Sun, 1=Mon ... 6=Sat
const WEEKDAY_SHORT_KEYS = [
  'day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat',
];

/* ── Helpers ── */

/** Get all payment dates for a subscription within a given month */
function getPaymentDatesInMonth(sub: Subscription, year: number, month: number): Date[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = endOfMonth(monthStart);
  const next = new Date(sub.nextPaymentDate);
  const dates: Date[] = [];

  if (sub.cycle === 'one-time') {
    if (next.getFullYear() === year && next.getMonth() === month) {
      dates.push(new Date(year, month, next.getDate()));
    }
    return dates;
  }

  if (sub.cycle === 'monthly') {
    const day = next.getDate();
    const lastDay = monthEnd.getDate();
    const payDay = Math.min(day, lastDay);
    dates.push(new Date(year, month, payDay));
    return dates;
  }

  if (sub.cycle === 'yearly') {
    if (next.getMonth() === month) {
      const day = next.getDate();
      const lastDay = monthEnd.getDate();
      dates.push(new Date(year, month, Math.min(day, lastDay)));
    }
    return dates;
  }

  if (sub.cycle === 'weekly') {
    let cursor = new Date(next);
    while (isBefore(monthStart, cursor)) {
      cursor = addWeeks(cursor, -1);
    }
    while (cursor <= monthEnd) {
      if (cursor >= monthStart && cursor <= monthEnd) {
        dates.push(new Date(cursor));
      }
      cursor = addWeeks(cursor, 1);
    }
    return dates;
  }

  return dates;
}

type PaymentMap = Map<number, Subscription[]>;

function getPaymentsForMonth(subs: Subscription[], year: number, month: number): PaymentMap {
  const map: PaymentMap = new Map();
  const active = subs.filter((s) => s.isActive);

  for (const sub of active) {
    const dates = getPaymentDatesInMonth(sub, year, month);
    for (const d of dates) {
      const day = d.getDate();
      const arr = map.get(day) || [];
      arr.push(sub);
      map.set(day, arr);
    }
  }

  return map;
}

function getUrgencyColor(date: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 2) return '#FF453A';
  if (diff <= 7) return '#FFD60A';
  return '#00FF41';
}

function priceInCurrency(sub: Subscription, settings: AppSettings): number {
  return convertCurrency(sub.price, sub.currency as Currency, settings.displayCurrency as Currency, settings.exchangeRate);
}

/* ── Component ── */

export function CalendarPage({ subscriptions, settings, onSubTap }: CalendarPageProps) {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [direction, setDirection] = useState(0);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const symbol = CURRENCY_SYMBOLS[settings.displayCurrency] || settings.displayCurrency;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const payments = useMemo(
    () => getPaymentsForMonth(subscriptions, year, month),
    [subscriptions, year, month],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentMonth((m) => addMonths(m, 1));
    setSelectedDay(null);
    soundEngine.tap();
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentMonth((m) => subMonths(m, 1));
    setSelectedDay(null);
    soundEngine.tap();
  }, []);

  const goToday = useCallback(() => {
    const now = new Date();
    setDirection(0);
    setCurrentMonth(now);
    setSelectedDay(now);
    soundEngine.tap();
  }, []);

  const handleTitleTap = useCallback(() => {
    setShowYearPicker((p) => !p);
    soundEngine.tap();
  }, []);

  const pickMonth = useCallback((monthIdx: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIdx, 1));
    setSelectedDay(null);
    setShowYearPicker(false);
    soundEngine.tap();
  }, [currentMonth]);

  const pickYear = useCallback((yr: number) => {
    setCurrentMonth(new Date(yr, currentMonth.getMonth(), 1));
    soundEngine.tap();
  }, [currentMonth]);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-5 gap-3">
        <span className="text-5xl">📅</span>
        <p className="text-text-secondary text-sm font-medium">{t('nav.calendar')}</p>
        <p className="text-text-muted text-xs">{t('calendar.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-5 pt-2 pb-4">
      {/* Section 1: Month navigation */}
      <MonthNavigation
        year={year}
        month={month}
        onPrev={goPrev}
        onNext={goNext}
        onTitleTap={handleTitleTap}
      />

      {/* Year/Month picker */}
      <AnimatePresence>
        {showYearPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-3">
              {/* Year row */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pickYear(year - 1)}
                  className="text-text-muted active:text-neon transition-colors px-2 py-1"
                >
                  ‹
                </motion.button>
                <span className="text-sm font-bold text-text-primary tabular-nums w-12 text-center">
                  {year}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pickYear(year + 1)}
                  className="text-text-muted active:text-neon transition-colors px-2 py-1"
                >
                  ›
                </motion.button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {MONTH_FULL_KEYS.map((key, i) => {
                  const isCurrentMonth = i === month;
                  const isNow = i === new Date().getMonth() && year === new Date().getFullYear();
                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => pickMonth(i)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-semibold transition-colors',
                        isCurrentMonth
                          ? 'bg-neon text-surface'
                          : isNow
                            ? 'bg-neon/10 text-neon border border-neon/20'
                            : 'text-text-secondary active:bg-surface-4',
                      )}
                    >
                      {t(key).substring(0, 3)}
                    </motion.button>
                  );
                })}
              </div>

              {/* Today button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { goToday(); setShowYearPicker(false); }}
                className="w-full py-2 rounded-xl text-xs font-semibold text-neon bg-neon/5 border border-neon/20 active:bg-neon/10 transition-colors"
              >
                {t('calendar.today')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 2: Calendar grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <CalendarGrid
            year={year}
            month={month}
            payments={payments}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </motion.div>
      </AnimatePresence>

      {/* Section 3: Selected day details */}
      <AnimatePresence>
        {selectedDay && isSameMonth(selectedDay, currentMonth) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <DayDetails
              date={selectedDay}
              subs={payments.get(selectedDay.getDate()) || []}
              settings={settings}
              symbol={symbol}
              onSubTap={onSubTap}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 4: Monthly schedule */}
      <MonthSchedule
        year={year}
        month={month}
        payments={payments}
        settings={settings}
        symbol={symbol}
        onSubTap={onSubTap}
      />
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 1: Навигация по месяцам
   ═══════════════════════════════════════ */

function MonthNavigation({
  year,
  month,
  onPrev,
  onNext,
  onTitleTap,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onTitleTap: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={onPrev}
        className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary active:text-neon transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onTitleTap}
        className="text-base font-display font-bold text-text-primary active:text-neon transition-colors"
      >
        {t(MONTH_FULL_KEYS[month])} {year}
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={onNext}
        className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary active:text-neon transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </motion.button>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 2: Календарная сетка
   ═══════════════════════════════════════ */

function CalendarGrid({
  year,
  month,
  payments,
  selectedDay,
  onSelectDay,
}: {
  year: number;
  month: number;
  payments: PaymentMap;
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
}) {
  const { t } = useLanguage();
  const monthDate = new Date(year, month, 1);
  const mStart = startOfMonth(monthDate);
  const mEnd = endOfMonth(monthDate);

  const calStart = startOfWeek(mStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-subtle p-3">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider py-1.5">
            {t(key)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthDate);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isTodayDate = isToday(day);
          const dayNum = day.getDate();
          const daySubs = inMonth ? (payments.get(dayNum) || []) : [];
          const hasSubs = daySubs.length > 0;

          return (
            <motion.button
              key={day.toISOString()}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                soundEngine.tap();
                onSelectDay(day);
              }}
              className={cn(
                'relative flex flex-col items-center justify-center aspect-square rounded-xl transition-colors',
                !inMonth && 'opacity-30',
                isSelected && 'bg-surface-3',
                isTodayDate && !isSelected && 'ring-1 ring-neon/60',
                isSelected && 'ring-1 ring-neon',
              )}
            >
              <span className={cn(
                'text-sm tabular-nums',
                isSelected ? 'font-bold text-neon' : 'text-text-primary',
                isTodayDate && !isSelected && 'font-bold text-neon',
              )}>
                {dayNum}
              </span>

              {/* Payment dots */}
              {hasSubs && inMonth && (
                <div className="flex gap-0.5 mt-0.5 h-1.5">
                  {daySubs.length <= 3 ? (
                    daySubs.map((s, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getUrgencyColor(new Date(year, month, dayNum)) }}
                      />
                    ))
                  ) : (
                    <>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getUrgencyColor(new Date(year, month, dayNum)) }}
                        />
                      ))}
                      <span className="text-[7px] text-text-muted leading-none ml-0.5">
                        +{daySubs.length - 3}
                      </span>
                    </>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 3: Детали выбранного дня
   ═══════════════════════════════════════ */

function DayDetails({
  date,
  subs,
  settings,
  symbol,
  onSubTap,
}: {
  date: Date;
  subs: Subscription[];
  settings: AppSettings;
  symbol: string;
  onSubTap?: (sub: Subscription) => void;
}) {
  const { t, lang } = useLanguage();
  const isPast = isBefore(date, new Date(new Date().setHours(0, 0, 0, 0)));
  const dateStr = format(date, 'd MMMM yyyy', { locale: lang === 'en' ? enUS : ru });

  const total = subs.reduce((sum, s) => sum + priceInCurrency(s, settings), 0);

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
      <h3 className="text-sm font-bold text-text-primary mb-3 capitalize">{dateStr}</h3>

      {subs.length === 0 ? (
        <p className="text-xs text-text-muted py-2">{t('calendar.noPayments')}</p>
      ) : (
        <div className="space-y-2.5">
          {subs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => onSubTap?.(sub)}
              className="w-full flex items-center gap-3 text-left active:bg-surface-3 rounded-lg transition-colors -mx-1 px-1 py-0.5"
            >
              <span className="text-lg"><ServiceLogo name={sub.name} emoji={sub.icon} size={22} /></span>
              <span className="flex-1 text-sm text-text-primary font-medium truncate">{sub.name}</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
                {Math.round(priceInCurrency(sub, settings)).toLocaleString('ru-RU')} {symbol}
              </span>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0',
                isPast
                  ? 'bg-neon/10 text-neon'
                  : 'bg-yellow-500/10 text-yellow-400',
              )}>
                {isPast ? t('calendar.paid') : t('calendar.pending')}
              </span>
            </button>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-border-subtle">
            <span className="text-xs text-text-muted">{t('calendar.total')}</span>
            <span className="text-sm font-bold text-neon tabular-nums">
              {Math.round(total).toLocaleString('ru-RU')} {symbol}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 4: Расписание текущего месяца
   ═══════════════════════════════════════ */

function MonthSchedule({
  year,
  month,
  payments,
  settings,
  symbol,
  onSubTap,
}: {
  year: number;
  month: number;
  payments: PaymentMap;
  settings: AppSettings;
  symbol: string;
  onSubTap?: (sub: Subscription) => void;
}) {
  const { t } = useLanguage();

  const sortedDays = Array.from(payments.entries())
    .sort(([a], [b]) => a - b);

  if (sortedDays.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthTotal = sortedDays.reduce((sum, [, subs]) => {
    return sum + subs.reduce((s, sub) => s + priceInCurrency(sub, settings), 0);
  }, 0);

  const monthName = t(MONTH_FULL_KEYS[month]).toLowerCase();

  return (
    <div>
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3 pl-1">
        {t('calendar.schedule', { month: monthName })}
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[23px] top-4 bottom-4 w-px bg-gradient-to-b from-neon/40 via-neon/15 to-transparent" />

        <div className="space-y-0">
          {sortedDays.map(([day, subs], i) => {
            const date = new Date(year, month, day);
            const isPast = isBefore(date, today);
            const dayOfWeek = t(WEEKDAY_SHORT_KEYS[getDay(date)]);
            const urgencyColor = getUrgencyColor(date);

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                className="flex gap-3 py-2.5"
              >
                {/* Date column + dot */}
                <div className="flex flex-col items-center w-[46px] shrink-0">
                  <span className="text-sm font-bold text-text-primary tabular-nums">{day}</span>
                  <span className="text-[10px] text-text-muted">{dayOfWeek}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 relative z-10"
                    style={{ backgroundColor: isPast ? '#8E8E93' : urgencyColor }}
                  />
                </div>

                {/* Payment cards */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {subs.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => onSubTap?.(sub)}
                      className="w-full flex items-center gap-2.5 bg-surface-2 rounded-xl border border-border-subtle px-3 py-2.5 text-left active:bg-surface-3 transition-colors"
                    >
                      <span className="text-base shrink-0"><ServiceLogo name={sub.name} emoji={sub.icon} size={20} /></span>
                      <span className="flex-1 text-sm text-text-primary font-medium truncate">{sub.name}</span>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-text-primary tabular-nums">
                          {Math.round(priceInCurrency(sub, settings)).toLocaleString('ru-RU')} {symbol}
                        </span>
                        {isPast && (
                          <p className="text-[10px] text-text-muted">{t('calendar.paid')}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Month total */}
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 mt-3 flex items-center justify-between">
        <span className="text-sm text-text-secondary font-medium">
          {t('calendar.monthTotal', { month: monthName })}
        </span>
        <span className="text-base font-bold text-neon tabular-nums">
          {Math.round(monthTotal).toLocaleString('ru-RU')} {symbol}
        </span>
      </div>
    </div>
  );
}
