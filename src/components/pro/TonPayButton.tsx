'use client';

import { useState, useEffect } from 'react';
import { TonConnectUIProvider, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase';

type Plan = 'monthly' | 'yearly' | 'lifetime';
type Status = 'idle' | 'creating' | 'sending' | 'confirming' | 'error';

const PLAN_USD_DISPLAY: Record<Plan, string> = {
  monthly:  '$2.99',
  yearly:   '$19.99',
  lifetime: '$34.99',
};

interface TonPayButtonInnerProps {
  plan: Plan;
  isRu: boolean;
  onSuccess: () => void;
}

function TonPayButtonInner({ plan, isRu, onSuccess }: TonPayButtonInnerProps) {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [memo, setMemo] = useState('');

  // Poll for blockchain confirmation after transaction is sent
  useEffect(() => {
    if (status !== 'confirming' || !memo) return;

    let attempts = 0;
    const maxAttempts = 40; // 40 × 3s = 2 min

    const poll = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/ton/check-payment?memo=${memo}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (data.paid) {
          onSuccess();
          return;
        }
      } catch { /* ignore poll errors */ }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 3000);
      } else {
        setStatus('error');
        setError(isRu
          ? 'Подтверждение не получено. Средства в безопасности — обратитесь в @by_arto если PRO не активировался.'
          : 'Confirmation timeout. Funds are safe — contact @by_arto if PRO was not activated.',
        );
      }
    };

    setTimeout(poll, 4000);
  }, [status, memo, isRu, onSuccess]);

  async function handleConnect() {
    await tonConnectUI.openModal();
  }

  async function handlePay() {
    setError('');
    setStatus('creating');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(isRu ? 'Нужна авторизация' : 'Authorization required');
        setStatus('error');
        return;
      }

      const res = await fetch('/api/ton/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isRu ? 'Ошибка создания платежа' : 'Payment creation failed'));
        setStatus('error');
        return;
      }

      setMemo(data.memo);
      setStatus('sending');

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 1800,
        messages: [{
          address: data.address,
          amount:  data.amount_nano,
          payload: data.payload,
        }],
      });

      setStatus('confirming');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      // User cancelled — don't show an error
      if (msg.includes('Reject') || msg.includes('cancel') || msg.includes('USER_REJECTS_ERROR')) {
        setStatus('idle');
        return;
      }
      setError(isRu ? 'Ошибка транзакции. Попробуйте ещё раз.' : 'Transaction error. Please try again.');
      setStatus('error');
    }
  }

  const isLoading = status === 'creating' || status === 'sending';

  if (status === 'confirming') {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <p style={{ fontSize: 13, color: '#00FF41', fontWeight: 700, margin: '0 0 4px' }}>
          💎 {isRu ? 'Транзакция отправлена!' : 'Transaction sent!'}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
          {isRu
            ? 'Ожидаем подтверждение блокчейна (~5–30 сек)…'
            : 'Awaiting blockchain confirmation (~5–30 sec)…'}
        </p>
        <div style={{
          marginTop: 8,
          width: 20, height: 20,
          border: '2px solid rgba(0,255,65,0.25)',
          borderTop: '2px solid #00FF41',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '8px auto 0',
        }} />
      </div>
    );
  }

  return (
    <>
      {error && status === 'error' && (
        <p style={{ fontSize: 11, color: '#ff6b6b', textAlign: 'center', margin: '0 0 8px', lineHeight: 1.5 }}>
          {error}
        </p>
      )}

      {!wallet ? (
        /* Step 1: Connect wallet */
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConnect}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #0098ea, #006aad)',
            color: '#fff', fontSize: 14, fontWeight: 800,
            width: '100%', padding: '13px 16px', borderRadius: 14,
            border: 'none', cursor: 'pointer', display: 'block', boxSizing: 'border-box',
          }}
        >
          <motion.div
            animate={{ x: ['-120%', '220%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            style={{
              position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
              pointerEvents: 'none',
            }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>
            💎 {isRu ? 'Подключить TON-кошелёк' : 'Connect TON Wallet'}
          </span>
        </motion.button>
      ) : (
        /* Step 2: Pay */
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePay}
          disabled={isLoading}
          style={{
            position: 'relative', overflow: 'hidden',
            background: isLoading
              ? 'rgba(0,152,234,0.4)'
              : 'linear-gradient(135deg, #0098ea, #006aad)',
            color: '#fff', fontSize: 14, fontWeight: 800,
            width: '100%', padding: '13px 16px', borderRadius: 14,
            border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'block', boxSizing: 'border-box',
          }}
        >
          {!isLoading && (
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '45%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                pointerEvents: 'none',
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>
            {isLoading
              ? (isRu ? 'Загрузка…' : 'Loading…')
              : `💎 ${isRu ? 'Оплатить TON' : 'Pay with TON'} · ≈${PLAN_USD_DISPLAY[plan]}`}
          </span>
        </motion.button>
      )}

      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', margin: '5px 0 0' }}>
        Tonkeeper · MyTonWallet · Telegram Wallet
      </p>
    </>
  );
}

export function TonPayButton({ plan, isRu, onSuccess }: TonPayButtonInnerProps) {
  return (
    <TonConnectUIProvider manifestUrl="https://www.subeasy.org/tonconnect-manifest.json">
      <TonPayButtonInner plan={plan} isRu={isRu} onSuccess={onSuccess} />
    </TonConnectUIProvider>
  );
}
