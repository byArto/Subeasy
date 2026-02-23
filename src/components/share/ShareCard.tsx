'use client';

import { forwardRef } from 'react';
import { Subscription, DisplayCurrency } from '@/lib/types';
import { Lang, translate } from '@/lib/translations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { getSpendBadge } from '@/lib/badge';
import { getMonthlyPrice, convertCurrency } from '@/lib/utils';

interface ShareCardProps {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  currency: DisplayCurrency;
  subscriptions: Subscription[];
  lang: Lang;
  exchangeRate: number;
}

function getMonthLabel(lang: Lang): string {
  const now = new Date();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const month = now.toLocaleDateString(locale, { month: 'long' });
  const year = now.getFullYear();
  return month.charAt(0).toUpperCase() + month.slice(1) + ' ' + year;
}

function buildCategoryBars(
  subscriptions: Subscription[],
  currency: DisplayCurrency,
  exchangeRate: number,
  totalMonthly: number
): Array<{ name: string; amount: number; pct: number }> {
  const totals: Record<string, number> = {};
  for (const sub of subscriptions) {
    if (!sub.isActive || sub.cycle === 'trial' || sub.cycle === 'one-time') continue;
    const monthly = getMonthlyPrice(sub);
    const converted = convertCurrency(monthly, sub.currency, currency, exchangeRate);
    const cat = sub.category || 'other';
    totals[cat] = (totals[cat] || 0) + converted;
  }
  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0,
    }));
}

// Neon shades for bars: brightest → most muted
const BAR_COLORS = ['#39FF14', '#2ECC10', '#1F8B0A', '#134F06'];

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate }, ref) {
    const t = (key: string) => translate(key, lang);
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const badge = getSpendBadge(totalMonthly, currency);
    const monthLabel = getMonthLabel(lang);
    const categories = buildCategoryBars(subscriptions, currency, exchangeRate, totalMonthly);

    const formattedMonthly = Math.round(totalMonthly).toLocaleString('ru-RU');
    const formattedYearly = Math.round(totalYearly).toLocaleString('ru-RU');

    return (
      <div
        ref={ref}
        style={{
          width: '360px',
          background: 'linear-gradient(145deg, #111111, #0d0d0d)',
          borderRadius: '20px',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Neon top border */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #39FF14, transparent)',
        }} />

        {/* Corner glow */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '120px', height: '120px',
          background: 'radial-gradient(circle, rgba(57,255,20,0.08), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#39FF14', letterSpacing: '0.5px' }}>
            SubEasy
          </span>
          <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>
            {monthLabel}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, #39FF1420, #39FF1440, #39FF1420)', marginBottom: '20px' }} />

        {/* Main amount */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            fontSize: '48px', fontWeight: 800, color: '#39FF14',
            lineHeight: 1.1, letterSpacing: '-1px',
            textShadow: '0 0 20px rgba(57,255,20,0.4)',
          }}>
            {formattedMonthly}
            <span style={{ fontSize: '24px', fontWeight: 700, marginLeft: '3px' }}>{symbol}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', fontWeight: 500 }}>
            {t('share.perMonth')}
          </div>
        </div>

        {/* Category progress bars */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {categories.map(({ name, amount, pct }, i) => (
              <div key={name} style={{ marginBottom: i < categories.length - 1 ? '10px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px', color: '#888', fontWeight: 500,
                    textTransform: 'capitalize',
                    maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>
                    {Math.round(amount).toLocaleString('ru-RU')} {symbol}
                  </span>
                </div>
                <div style={{ height: '5px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max(pct, 2)}%`,
                    background: BAR_COLORS[i] || BAR_COLORS[3],
                    borderRadius: '3px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '16px',
          fontSize: '11px', color: '#555', marginBottom: '18px', fontWeight: 500,
        }}>
          <span>{activeCount} {t('share.subsCount')}</span>
          <span style={{ color: '#333' }}>•</span>
          <span>{formattedYearly} {symbol} {t('share.perYear')}</span>
        </div>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px',
            background: 'rgba(57,255,20,0.05)',
            border: '1px solid rgba(57,255,20,0.25)',
            borderRadius: '100px',
            fontSize: '13px', fontWeight: 700, color: '#39FF14',
          }}>
            <span style={{ fontSize: '16px' }}>{badge.emoji}</span>
            {t(badge.labelKey)}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '12px' }} />

        {/* Footer CTA */}
        <div style={{
          textAlign: 'center', fontSize: '11px', color: '#444', fontWeight: 500,
        }}>
          {t('share.cta')} ↗
        </div>
      </div>
    );
  }
);
