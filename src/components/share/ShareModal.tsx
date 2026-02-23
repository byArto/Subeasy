'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ShareCard } from './ShareCard';
import { Subscription, DisplayCurrency } from '@/lib/types';
import { Lang } from '@/lib/translations';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import { buildShareCanvas } from '@/lib/shareCanvas';

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
  const [generating, setGenerating] = useState(false);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);

  const cardProps = { totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate };

  async function handleShare() {
    setGenerating(true);
    try {
      const canvas = buildShareCanvas(cardProps);
      const dataUrl = canvas.toDataURL('image/png');

      // Use toBlob — more reliable in WebViews than fetch(data:URL)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      );
      const file = new File([blob], 'subeasy-stats.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // Fallback: show image in modal for long-press save/share
        setSavedImageUrl(dataUrl);
      }
    } catch (e) {
      console.error('Share failed:', e);
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    setGenerating(true);
    try {
      const canvas = buildShareCanvas(cardProps);
      setSavedImageUrl(canvas.toDataURL('image/png'));
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
    <Modal open={open} onClose={handleClose} title={t('share.title')} size="full">
      {savedImageUrl ? (
        /* Saved state: show image for long-press to save */
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
          {/* Preview — scrollable above sticky buttons */}
          <div className="flex justify-center mb-4" style={{ overflow: 'hidden', maxHeight: '280px' }}>
            <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center', marginBottom: '-60px' }}>
              <ShareCard {...cardProps} />
            </div>
          </div>

          {/* Buttons — sticky to bottom of the modal scroll container */}
          <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-2 bg-surface-2 border-t border-border-subtle flex flex-col gap-3">
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
  );
}
