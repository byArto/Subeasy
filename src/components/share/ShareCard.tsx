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

const BAR_COLORS = ['#39FF14', '#2ECC10', '#1A8C0A', '#0F5206'];

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
          background: 'linear-gradient(160deg, #0e0e16 0%, #0a0a0a 45%, #0c100c 100%)',
          borderRadius: '20px',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Background: bottom-left blue accent glow */}
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '220px', height: '220px',
          background: 'radial-gradient(circle, rgba(60,80,255,0.07), transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Background: top-right neon green glow */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(57,255,20,0.09), transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Subtle grid overlay — horizontal lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 28px)',
          pointerEvents: 'none',
        }} />

        {/* Neon top border */}
        <div style={{
          position: 'absolute', top: 0, left: '8%', right: '8%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #39FF14CC, transparent)',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#39FF14', letterSpacing: '1px' }}>
            SubEasy
          </span>
          <span style={{ fontSize: '11px', color: '#555', fontWeight: 500 }}>
            {monthLabel}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, #39FF1415, #39FF1435, #39FF1415)', marginBottom: '20px' }} />

        {/* Main amount */}
        <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative' }}>
          <div style={{ fontSize: '13px', color: '#555', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            {t('share.perMonth')}
          </div>
          <div style={{
            fontSize: '52px', fontWeight: 800, color: '#39FF14',
            lineHeight: 1, letterSpacing: '-2px',
            textShadow: '0 0 30px rgba(57,255,20,0.35)',
          }}>
            {formattedMonthly}
            <span style={{ fontSize: '22px', fontWeight: 700, marginLeft: '4px', letterSpacing: 0 }}>{symbol}</span>
          </div>
        </div>

        {/* Category bars */}
        {categories.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '18px',
            position: 'relative',
          }}>
            {categories.map(({ name, amount, pct }, i) => (
              <div key={name} style={{ marginBottom: i < categories.length - 1 ? '12px' : 0 }}>
                {/* Label row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Color dot */}
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: BAR_COLORS[i],
                      boxShadow: `0 0 6px ${BAR_COLORS[i]}80`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '11px', color: '#aaa', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {name}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 700 }}>
                    {Math.round(amount).toLocaleString('ru-RU')} {symbol}
                  </span>
                </div>
                {/* Bar */}
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max(pct, 2)}%`,
                    background: `linear-gradient(90deg, ${BAR_COLORS[i]}, ${BAR_COLORS[i]}99)`,
                    borderRadius: '3px',
                    boxShadow: `0 0 8px ${BAR_COLORS[i]}50`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '14px',
          fontSize: '11px', color: '#444', marginBottom: '16px', fontWeight: 500,
        }}>
          <span>{activeCount} {t('share.subsCount')}</span>
          <span style={{ color: '#2a2a2a' }}>•</span>
          <span>{formattedYearly} {symbol} {t('share.perYear')}</span>
        </div>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px',
            background: 'rgba(57,255,20,0.06)',
            border: '1px solid rgba(57,255,20,0.22)',
            borderRadius: '100px',
            fontSize: '13px', fontWeight: 700, color: '#39FF14',
          }}>
            <span style={{ fontSize: '16px' }}>{badge.emoji}</span>
            {t(badge.labelKey)}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '12px' }} />

        {/* Footer CTA */}
        <div style={{
          textAlign: 'center', fontSize: '11px', color: '#3a3a3a', fontWeight: 500, letterSpacing: '0.3px',
        }}>
          {t('share.cta')} ↗
        </div>
      </div>
    );
  }
);
