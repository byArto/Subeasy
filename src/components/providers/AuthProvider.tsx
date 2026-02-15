'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  skipAuth: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
        signUp,
        signIn,
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
  if (msg.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (msg.includes('User already registered')) return 'Пользователь уже зарегистрирован';
  if (msg.includes('Password should be at least')) return 'Пароль должен быть минимум 6 символов';
  if (msg.includes('Unable to validate email')) return 'Некорректный email';
  if (msg.includes('Email not confirmed')) return 'Подтвердите email (проверьте почту)';
  if (msg.includes('rate limit')) return 'Слишком много попыток, подождите';
  return msg;
}
