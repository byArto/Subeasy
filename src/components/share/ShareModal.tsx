'use client';

import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ShareCard } from './ShareCard';
import { Subscription, DisplayCurrency } from '@/lib/types';
import { Lang } from '@/lib/translations';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  currency: DisplayCurrency;
  subscriptions: Subscription[];
  lang: Lang;
  exchangeRate: number;
}

export function ShareModal({
  open,
  onClose,
  totalMonthly,
  totalYearly,
  activeCount,
  currency,
  subscriptions,
  lang,
  exchangeRate,
}: ShareModalProps) {
  const { t } = useLanguage();
  // Capture ref points to off-screen full-size card (outside modal transform/overflow)
  const captureRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const cardProps = { totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate };

  async function captureCard(): Promise<Blob | null> {
    if (!captureRef.current) return null;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(captureRef.current, {
      scale: 2,
      useCORS: false,
      allowTaint: true,
      backgroundColor: '#0d0d0d',
      logging: false,
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  async function handleShare() {
    setGenerating(true);
    try {
      const blob = await captureCard();
      if (!blob) return;
      const file = new File([blob], 'subeasy-stats.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        downloadBlob(blob);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setGenerating(true);
    try {
      const blob = await captureCard();
      if (!blob) return;
      downloadBlob(blob);
    } finally {
      setGenerating(false);
    }
  }

  function downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subeasy-stats.png';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Off-screen capture target — NOT inside modal transform/overflow */}
      {open && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <ShareCard ref={captureRef} {...cardProps} />
        </div>
      )}

      <Modal open={open} onClose={onClose} title={t('share.title')} size="full">
        {/* Visual preview — scaled to fit, no ref needed */}
        <div className="flex justify-center mb-6 overflow-hidden">
          <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center', marginBottom: '-40px' }}>
            <ShareCard {...cardProps} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleShare}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neon text-black font-bold text-sm active:opacity-80 transition-opacity disabled:opacity-50"
          >
            <ShareIcon className="w-4 h-4" />
            {generating ? t('share.generating') : t('share.title')}
          </button>
          <button
            onClick={handleSave}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface-3 border border-border-subtle text-text-primary font-semibold text-sm active:opacity-80 transition-opacity disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {t('share.save')}
          </button>
        </div>
      </Modal>
    </>
  );
}
