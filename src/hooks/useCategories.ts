'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Category } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { generateId } from '@/lib/utils';

export function useCategories() {
  const [categories, setCategories] = useLocalStorage<Category[]>(
    'neonsub-categories',
    DEFAULT_CATEGORIES
  );

  // Migration: rename VPN/Безопасность → VPN/Proxy
  const migrated = useRef(false);
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    const vpnCat = categories.find((c) => c.id === '8' && c.name === 'VPN/Безопасность');
    if (vpnCat) {
      setCategories((prev) =>
        prev.map((c) => (c.id === '8' && c.name === 'VPN/Безопасность' ? { ...c, name: 'VPN/Proxy' } : c))
      );
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const addCategory = useCallback(
    (cat: Omit<Category, 'id'>) => {
      const newCat: Category = { ...cat, id: generateId() };
      setCategories((prev) => [...prev, newCat]);
    },
    [setCategories]
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<Category>) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    [setCategories]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    [setCategories]
  );

  const getCategoryById = useCallback(
    (id: string): Category | undefined => {
      return categories.find((c) => c.id === id);
    },
    [categories]
  );

  return {
    categories,
    setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
  };
}
