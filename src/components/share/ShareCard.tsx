'use client';

import { forwardRef } from 'react';
import { Subscription, DisplayCurrency } from '@/lib/types';
import { Lang, translate } from '@/lib/translations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { getSpendBadge } from '@/lib/badge';

interface ShareCardProps {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  currency: DisplayCurrency;
  subscriptions: Subscription[];
  lang: Lang;
}

function getMonthLabel(lang: Lang): string {
  const now = new Date();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const month = now.toLocaleDateString(locale, { month: 'long' });
  const year = now.getFullYear();
  // Capitalize first letter
  return month.charAt(0).toUpperCase() + month.slice(1) + ' ' + year;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ totalMonthly, totalYearly, activeCount, currency, subscriptions, lang }, ref) {
    const t = (key: string) => translate(key, lang);
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const badge = getSpendBadge(totalMonthly, currency);
    const monthLabel = getMonthLabel(lang);

    const formattedMonthly = Math.round(totalMonthly).toLocaleString('ru-RU');
    const formattedYearly = Math.round(totalYearly).toLocaleString('ru-RU');

    // Active subscriptions with emoji, max 8
    const activeSlice = subscriptions.filter(s => s.isActive).slice(0, 8);
    const extraCount = Math.max(0, subscriptions.filter(s => s.isActive).length - 8);

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
        {/* Neon glow top border */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #39FF14, transparent)',
          borderRadius: '0 0 4px 4px',
        }} />

        {/* Corner glow */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '120px', height: '120px',
          background: 'radial-gradient(circle, rgba(57,255,20,0.08), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header row */}
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
            <span style={{ fontSize: '24px', fontWeight: 700, marginLeft: '3px', color: '#39FF14' }}>{symbol}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', fontWeight: 500 }}>
            {t('share.perMonth')}
          </div>
        </div>

        {/* Service emoji grid */}
        {activeSlice.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '8px',
            flexWrap: 'wrap', marginBottom: '16px',
          }}>
            {activeSlice.map((sub) => (
              <div key={sub.id} style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `linear-gradient(135deg, ${sub.color}22, ${sub.color}44)`,
                border: `1px solid ${sub.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px',
              }}>
                {sub.icon || '📦'}
              </div>
            ))}
            {extraCount > 0 && (
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#1a1a1a', border: '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#888', fontWeight: 600,
              }}>
                +{extraCount}
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '16px',
          fontSize: '12px', color: '#666', marginBottom: '20px', fontWeight: 500,
        }}>
          <span>{activeCount} {t('share.subsCount')}</span>
          <span style={{ color: '#444' }}>•</span>
          <span>{formattedYearly} {symbol} {t('share.perYear')}</span>
        </div>

        {/* Badge */}
        <div style={{
          display: 'flex', justifyContent: 'center', marginBottom: '20px',
        }}>
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
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '14px' }} />

        {/* Footer CTA */}
        <div style={{
          textAlign: 'center', fontSize: '11px', color: '#555', fontWeight: 500, letterSpacing: '0.2px',
        }}>
          {t('share.cta')} ↗
        </div>
      </div>
    );
  }
);
