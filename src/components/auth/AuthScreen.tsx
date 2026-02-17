'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { signIn, signUp, setSkipAuth } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(t('auth.error.fillAll'));
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError(t('auth.error.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.error.passwordShort'));
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error: err } = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      const { error: err } = await signUp(email.trim(), password);
      if (err) setError(err);
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center max-w-[430px] mx-auto px-6 bg-gradient-to-b from-surface to-[#07070C]">

      {/* Language switcher — top right corner */}
      <div className="absolute top-12 right-5 flex items-center gap-0.5 bg-surface-2 border border-border-subtle rounded-lg p-0.5">
        {(['ru', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
              lang === l
                ? 'bg-neon text-surface'
                : 'text-text-muted'
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
          style={{
            filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.3))',
          }}
        />
        <h1 className="text-2xl font-display font-extrabold tracking-tight neon-text">
          SubEasy
        </h1>
      </motion.div>

      {/* Mode toggle */}
      <div className="flex w-full bg-surface-2 rounded-xl p-1 mb-6">
        {(['login', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              mode === m
                ? 'bg-surface-3 text-neon shadow-sm'
                : 'text-text-muted'
            }`}
          >
            {m === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        ))}
      </div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="w-full space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div>
          <label className="text-xs text-text-muted font-medium mb-1.5 block">{t('auth.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com"
            autoComplete="email"
            className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-neon/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted font-medium mb-1.5 block">{t('auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordMin')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-neon/30 transition-colors"
          />
        </div>

        <AnimatePresence>
          {mode === 'register' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <label className="text-xs text-text-muted font-medium mb-1.5 block">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-neon/30 transition-colors"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
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

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-neon text-surface font-bold text-sm rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
        >
          {loading
            ? '...'
            : mode === 'login'
              ? t('auth.submit.login')
              : t('auth.submit.register')}
        </button>
      </motion.form>

      {/* Skip auth */}
      <button
        onClick={() => setSkipAuth(true)}
        className="mt-6 text-text-muted text-xs font-medium hover:text-text-secondary transition-colors"
      >
        {t('auth.skip')}
      </button>
      <p className="mt-2 text-[10px] text-text-muted/60 text-center max-w-[260px]">
        {t('auth.skipNote')}
      </p>
    </div>
  );
}
