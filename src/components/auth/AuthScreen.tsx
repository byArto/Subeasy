'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

type Step = 'email' | 'code';

export function AuthScreen() {
  const { sendOtp, verifyOtp, setSkipAuth } = useAuth();
  const { t, lang, setLang } = useLanguage();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend cooldown (60s)
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus code input when step changes
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 300);
    }
  }, [step]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [resendCooldown]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t('auth.otp.error.empty'));
      return;
    }
    setLoading(true);
    const { error: err } = await sendOtp(email.trim().toLowerCase());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('code');
    setResendCooldown(60);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 6) {
      setError(t('auth.otp.error.codeEmpty'));
      return;
    }
    setLoading(true);
    const { error: err } = await verifyOtp(email.trim().toLowerCase(), trimmed);
    setLoading(false);
    if (err) {
      setError(err);
      setCode('');
    }
    // On success onAuthStateChange fires → user is set → AuthScreen unmounts
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setCode('');
    setLoading(true);
    const { error: err } = await sendOtp(email.trim().toLowerCase());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setResendCooldown(60);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center max-w-[430px] mx-auto px-6 bg-gradient-to-b from-surface to-[#07070C]">

      {/* Language switcher */}
      <div className="absolute top-12 right-5 flex items-center gap-0.5 bg-surface-2 border border-border-subtle rounded-lg p-0.5">
        {(['ru', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
              lang === l ? 'bg-neon text-surface' : 'text-text-muted'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center gap-3 mb-10"
      >
        <img
          src="/icons/splash-logo.png"
          alt="SubEasy"
          width={80}
          height={80}
          className="rounded-2xl"
          style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.3))' }}
        />
        <h1 className="text-2xl font-display font-extrabold tracking-tight neon-text">
          SubEasy
        </h1>
      </motion.div>

      {/* Steps */}
      <AnimatePresence mode="wait" initial={false}>

        {/* ── Step 1: Email ── */}
        {step === 'email' && (
          <motion.form
            key="email-step"
            onSubmit={handleSendCode}
            className="w-full space-y-4"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <div className="text-center mb-6">
              <p className="text-sm text-text-secondary">{t('auth.otp.subtitle')}</p>
            </div>

            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-neon/30 transition-colors"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-danger text-xs font-medium px-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-neon text-surface font-bold text-sm rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? t('auth.otp.sending') : t('auth.otp.sendCode')}
            </button>
          </motion.form>
        )}

        {/* ── Step 2: Code ── */}
        {step === 'code' && (
          <motion.form
            key="code-step"
            onSubmit={handleVerifyCode}
            className="w-full space-y-4"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22 }}
          >
            {/* Sent-to info */}
            <div className="text-center mb-2">
              <p className="text-xs text-text-muted">
                {t('auth.otp.codeSentTo')}
              </p>
              <p className="text-sm font-semibold text-text-primary mt-0.5 truncate">{email}</p>
            </div>

            {/* Code input */}
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block">{t('auth.otp.codeLabel')}</label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full px-4 py-4 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-2xl font-bold tracking-[0.35em] text-center placeholder:text-text-muted/30 placeholder:text-lg placeholder:tracking-normal focus:outline-none focus:border-neon/30 transition-colors"
              />
            </div>

            {/* Spam hint */}
            <p className="text-[11px] text-text-muted text-center px-2">
              {t('auth.otp.checkSpam')}
            </p>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-danger text-xs font-medium px-1 text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3.5 bg-neon text-surface font-bold text-sm rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? t('auth.otp.verifying') : t('auth.otp.verify')}
            </button>

            {/* Resend + back */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setStep('email'); setError(null); setCode(''); }}
                className="text-xs text-text-muted font-medium active:text-text-secondary transition-colors"
              >
                {t('auth.otp.changeEmail')}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="text-xs font-medium transition-colors disabled:opacity-40"
                style={{ color: resendCooldown > 0 ? undefined : '#00FF41' }}
              >
                {resendCooldown > 0
                  ? `${t('auth.otp.resend')} (${resendCooldown}с)`
                  : t('auth.otp.resend')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Skip auth */}
      <div className="absolute bottom-10 flex flex-col items-center gap-1.5">
        <button
          onClick={() => setSkipAuth(true)}
          className="text-text-muted text-xs font-medium active:text-text-secondary transition-colors"
        >
          {t('auth.skip')}
        </button>
        <p className="text-[10px] text-text-muted/60 text-center max-w-[260px]">
          {t('auth.skipNote')}
        </p>
      </div>
    </div>
  );
}
