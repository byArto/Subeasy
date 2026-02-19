'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function ProBadge({ onOpen }: { onOpen: () => void }) {
  const { lang } = useLanguage();

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
        gap: 5,
        background: 'rgba(245,200,66,0.12)',
        border: '1px solid rgba(245,200,66,0.3)',
        borderRadius: 20,
        padding: '4px 10px',
        color: '#f5c842',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: '#f5c842',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {lang === 'ru' ? 'PRO скоро' : 'PRO soon'}
    </motion.div>
  );
}
