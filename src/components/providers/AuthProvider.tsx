'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  skipAuth: boolean;
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setSkipAuth: (skip: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipAuth, setSkipAuth] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('neonsub-skip-auth') === 'true';
  });

  useEffect(() => {
    const supabase = createClient();

    // Don't block UI for users who skipped auth
    if (skipAuth) {
      setLoading(false);
    }

    // Safety timeout — never block UI for more than 3s even if Supabase is slow
    const timeout = setTimeout(() => setLoading(false), 3000);

    // Get initial session
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Step 1 — send 6-digit OTP to email */
  const sendOtp = useCallback(async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  /** Step 2 — verify the 6-digit code */
  const verifyOtp = useCallback(async (email: string, token: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const handleSetSkipAuth = useCallback((skip: boolean) => {
    setSkipAuth(skip);
    if (typeof window !== 'undefined') {
      if (skip) {
        window.localStorage.setItem('neonsub-skip-auth', 'true');
      } else {
        window.localStorage.removeItem('neonsub-skip-auth');
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        skipAuth,
        sendOtp,
        verifyOtp,
        signOut,
        setSkipAuth: handleSetSkipAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateAuthError(msg: string): string {
  if (
    msg.includes('Token has expired') ||
    msg.includes('token is invalid') ||
    msg.includes('Invalid') ||
    msg.includes('invalid')
  ) return 'Неверный или истёкший код';
  if (msg.includes('Unable to validate email') || msg.includes('valid email')) return 'Некорректный email';
  if (msg.includes('rate limit') || msg.includes('Rate limit') || msg.includes('429')) return 'Слишком много попыток, подождите';
  if (msg.includes('Email not confirmed')) return 'Email не подтверждён';
  return msg;
}
