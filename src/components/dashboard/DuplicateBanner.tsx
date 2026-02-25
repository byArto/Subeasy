'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import type { Subscription } from '@/lib/types';

interface DuplicateBannerProps {
  groups: Subscription[][];
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onIgnore: (id1: string, id2: string) => void;
}

export function DuplicateBanner({
  groups,
  onDeactivate,
  onDelete,
  onIgnore,
}: DuplicateBannerProps) {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  if (groups.length === 0) return null;

  const totalCount = groups.reduce((n, g) => n + g.length, 0);
  // preview: first group name + how many more subs total
  const firstName = groups[0][0].name;
  const moreCount = totalCount - 1;

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
        style={{
          background: 'rgba(255,184,0,0.08)',
          border: '1px solid rgba(255,184,0,0.22)',
        }}
      >
        {/* Warning icon */}
        <span className="text-warning text-lg shrink-0">⚠️</span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warning leading-tight">
            {t('dup.banner')}
          </p>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {firstName}{moreCount > 0 ? ` +${moreCount}` : ''}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className="shrink-0 text-warning/60"
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </motion.button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="compact" title={t('dup.modalTitle')}>
        <div className="space-y-4">
          {groups.map((group) => (
            <DupGroup
              key={group[0].name.toLowerCase()}
              group={group}
              onDeactivate={(id) => { onDeactivate(id); if (groups.length === 1) setModalOpen(false); }}
              onDelete={(id) => { onDelete(id); if (groups.length === 1) setModalOpen(false); }}
              onIgnore={(id1, id2) => { onIgnore(id1, id2); if (groups.length === 1) setModalOpen(false); }}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}

// ─── Single duplicate group ───────────────────────────────────────────────────

function DupGroup({
  group,
  onDeactivate,
  onDelete,
  onIgnore,
}: {
  group: Subscription[];
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onIgnore: (id1: string, id2: string) => void;
}) {
  const { t } = useLanguage();

  // For groups of exactly 2: show both + actions on pair
  // For groups of 3+: show all, actions target every sub except the first
  const [first, ...rest] = group;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,184,0,0.15)' }}
    >
      {/* Sub rows */}
      {group.map((sub, i) => (
        <SubRow key={sub.id} sub={sub} isFirst={i === 0} />
      ))}

      {/* Action buttons — target all "duplicates" (all except first) */}
      <AnimatePresence>
        <div className="flex gap-2 px-3 py-2.5 bg-surface-3/50 border-t border-border-subtle flex-wrap">
          <ActionButton
            label={t('dup.deactivate')}
            variant="warning"
            onClick={() => rest.forEach((s) => onDeactivate(s.id))}
          />
          <ActionButton
            label={t('dup.delete')}
            variant="danger"
            onClick={() => rest.forEach((s) => onDelete(s.id))}
          />
          <ActionButton
            label={t('dup.ignore')}
            variant="muted"
            onClick={() => {
              // ignore all pairs within the group
              for (let i = 0; i < group.length; i++)
                for (let j = i + 1; j < group.length; j++)
                  onIgnore(group[i].id, group[j].id);
            }}
          />
        </div>
      </AnimatePresence>
    </div>
  );
}

// ─── Sub row in the group card ────────────────────────────────────────────────

function SubRow({ sub, isFirst }: { sub: Subscription; isFirst: boolean }) {
  const { lang } = useLanguage();
  const sym = CURRENCY_SYMBOLS[sub.currency] ?? sub.currency;
  const cycleShort: Record<string, string> = {
    monthly: lang === 'ru' ? '/мес' : '/mo',
    yearly:  lang === 'ru' ? '/год' : '/yr',
    weekly:  lang === 'ru' ? '/нед' : '/wk',
    'one-time': '',
    trial: lang === 'ru' ? 'пробный' : 'trial',
  };

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2.5 ${!isFirst ? 'border-t border-border-subtle' : ''}`}
      style={{ background: isFirst ? 'transparent' : 'rgba(255,184,0,0.03)' }}
    >
      <span className="text-xl shrink-0">{sub.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{sub.name}</p>
        <p className="text-xs text-text-muted">
          {sub.isActive
            ? (lang === 'ru' ? 'Активна' : 'Active')
            : (lang === 'ru' ? 'Неактивна' : 'Inactive')}
        </p>
      </div>
      <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
        {sub.price} {sym}{cycleShort[sub.cycle] ?? ''}
      </span>
    </div>
  );
}

// ─── Small action button ──────────────────────────────────────────────────────

function ActionButton({
  label,
  variant,
  onClick,
}: {
  label: string;
  variant: 'warning' | 'danger' | 'muted';
  onClick: () => void;
}) {
  const colors = {
    warning: 'text-warning bg-warning/10 active:bg-warning/20',
    danger:  'text-danger  bg-danger/10  active:bg-danger/20',
    muted:   'text-text-muted bg-surface-4 active:bg-surface-3',
  };
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${colors[variant]}`}
    >
      {label}
    </motion.button>
  );
}
