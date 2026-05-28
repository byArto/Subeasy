/**
 * Typed converters between Supabase rows and app domain types.
 * Previously duplicated (untyped, `row: any`) in sync.ts and api/telegram/sendReport.
 */
import type { Subscription, Category, Currency, BillingCycle } from './types';

export interface SubscriptionRow {
  id: string;
  name: string;
  price: number | string;
  currency: string;
  category: string;
  cycle: string;
  next_payment_date: string | null;
  start_date: string | null;
  payment_method: string | null;
  notes: string | null;
  color: string | null;
  icon: string | null;
  management_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  workspace_id: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export function dbToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    currency: row.currency as Currency,
    category: row.category,
    cycle: row.cycle as BillingCycle,
    nextPaymentDate: row.next_payment_date ?? '',
    startDate: row.start_date ?? '',
    paymentMethod: row.payment_method ?? '',
    notes: row.notes ?? '',
    color: row.color ?? '#00FF41',
    icon: row.icon ?? '📦',
    managementUrl: row.management_url ?? '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
  };
}

export function dbToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
  };
}
