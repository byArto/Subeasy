'use client';

import { useCallback } from 'react';
import { Category } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { generateId } from '@/lib/utils';

export function useCategories() {
  const [categories, setCategories] = useLocalStorage<Category[]>(
    'neonsub-categories',
    DEFAULT_CATEGORIES
  );

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
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
  };
}
