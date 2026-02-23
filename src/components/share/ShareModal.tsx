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
  const captureRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  // After save: store data URL to show as long-pressable image
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);

  const cardProps = { totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate };

  async function captureCanvas() {
    if (!captureRef.current) return null;
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(captureRef.current, {
      scale: 2,
      useCORS: false,
      allowTaint: true,
      backgroundColor: '#0d0d0d',
      logging: false,
    });
  }

  async function handleShare() {
    setGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), 'image/png'));
      const file = new File([blob], 'subeasy-stats.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // Desktop fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'subeasy-stats.png'; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      // Show as image — user long-presses to save natively (works on iOS/Android/Telegram)
      setSavedImageUrl(canvas.toDataURL('image/png'));
    } finally {
      setGenerating(false);
    }
  }

  function handleClose() {
    setSavedImageUrl(null);
    onClose();
  }

  return (
    <>
      {/* Off-screen capture target — outside modal transform/overflow */}
      {open && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
          <ShareCard ref={captureRef} {...cardProps} />
        </div>
      )}

      <Modal open={open} onClose={handleClose} title={t('share.title')} size="full">
        {savedImageUrl ? (
          /* ── Saved state: show image for long-press save ── */
          <div className="flex flex-col items-center gap-4">
            <img
              src={savedImageUrl}
              alt="share card"
              className="w-full rounded-2xl shadow-lg"
              style={{ imageRendering: 'auto' }}
            />
            <p className="text-xs text-text-muted text-center px-4">{t('share.ready')}</p>
            <button
              onClick={() => setSavedImageUrl(null)}
              className="text-xs text-text-muted underline"
            >
              ← {t('share.title')}
            </button>
          </div>
        ) : (
          <>
            {/* Card preview */}
            <div className="flex justify-center mb-5" style={{ overflow: 'hidden', height: '340px' }}>
              <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center' }}>
                <ShareCard {...cardProps} />
              </div>
            </div>

            {/* Buttons */}
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
                {generating ? t('share.generating') : t('share.save')}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
