'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  // Ensure we're client-side before using createPortal
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cardProps = { totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate };

  async function capture(): Promise<string> {
    if (!captureRef.current) throw new Error('ref not ready');
    const domToImage = (await import('dom-to-image-more')).default;
    // Wait one frame to ensure element is fully painted
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return domToImage.toPng(captureRef.current, { scale: 2 });
  }

  async function handleShare() {
    setGenerating(true);
    try {
      const dataUrl = await capture();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'subeasy-stats.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // Desktop fallback
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'subeasy-stats.png';
        a.click();
      }
    } catch (e) {
      console.error('Share failed:', e);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setGenerating(true);
    try {
      const dataUrl = await capture();
      setSavedImageUrl(dataUrl);
    } catch (e) {
      console.error('Save failed:', e);
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
      {/* Portal: off-screen capture target at document.body — outside any overflow/transform */}
      {mounted && open && createPortal(
        <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <ShareCard ref={captureRef} {...cardProps} />
        </div>,
        document.body
      )}

      <Modal open={open} onClose={handleClose} title={t('share.title')} size="full">
        {savedImageUrl ? (
          /* Saved state: show image for long-press */
          <div className="flex flex-col items-center gap-4">
            <img
              src={savedImageUrl}
              alt="share card"
              className="w-full rounded-2xl"
              style={{ imageRendering: 'auto' }}
            />
            <p className="text-xs text-text-muted text-center px-2">{t('share.ready')}</p>
            <button
              onClick={() => setSavedImageUrl(null)}
              className="text-xs text-text-muted underline"
            >
              ← {t('share.title')}
            </button>
          </div>
        ) : (
          <>
            {/* Preview — scaled to fit, decorative only */}
            <div className="flex justify-center mb-5" style={{ overflow: 'hidden' }}>
              <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center', marginBottom: '-50px' }}>
                <ShareCard {...cardProps} />
              </div>
            </div>

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
