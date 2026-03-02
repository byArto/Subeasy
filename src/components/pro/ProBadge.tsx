'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { usePro } from '@/components/providers/ProProvider';

export function ProBadge({ onOpen }: { onOpen: () => void }) {
  const { lang } = useLanguage();
  const { isPro, proUntil, loading } = usePro();

  if (loading) return null;

  if (isPro) {
    const daysLeft = proUntil
      ? Math.ceil((proUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const label = daysLeft !== null
      ? `PRO · ${daysLeft}${lang === 'ru' ? 'д' : 'd'}`
      : 'PRO';

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(245,200,66,0.1)',
          border: '1px solid rgba(245,200,66,0.35)',
          borderRadius: 20,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 800,
          color: '#f5c842',
          flexShrink: 0,
        }}
      >
        👑 {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f5c842" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  return (
    <motion.div
      onClick={onOpen}
      animate={{
        boxShadow: [
          '0 0 0px rgba(245,200,66,0)',
          '0 0 12px rgba(245,200,66,0.25)',
          '0 0 0px rgba(245,200,66,0)',
        ],
      }}
      transition={{ duration: 2.5, repeat: Infinity }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(245,200,66,0.12)',
        border: '1px solid rgba(245,200,66,0.3)',
        borderRadius: 20,
        padding: '3px 8px',
        color: '#f5c842',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: '#f5c842',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {lang === 'ru' ? 'Стать PRO' : 'Go PRO'}
    </motion.div>
  );
}
