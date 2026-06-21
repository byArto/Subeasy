/**
 * Typed converters between Supabase rows and app domain types.
 * Previously duplicated (untyped, `row: any`) in sync.ts and api/telegram/sendReport.
 */
import type { Subscription, Category, Currency, BillingCycle, CycleAnchor, ObligationKind, LoanType, PaymentScheme } from './types';

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
  cycle_anchor: string | null;
  kind: string | null;
  lender: string | null;
  loan_type: string | null;
  principal_amount: number | string | null;
  outstanding_balance: number | string | null;
  interest_rate: number | string | null;
  term_months: number | null;
  payment_scheme: string | null;
  property_name: string | null;
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
    ...(row.cycle_anchor ? { cycleAnchor: row.cycle_anchor as CycleAnchor } : {}),
    ...(row.kind ? { kind: row.kind as ObligationKind } : {}),
    ...(row.lender ? { lender: row.lender } : {}),
    ...(row.loan_type ? { loanType: row.loan_type as LoanType } : {}),
    ...(row.principal_amount != null ? { principalAmount: Number(row.principal_amount) } : {}),
    ...(row.outstanding_balance != null ? { outstandingBalance: Number(row.outstanding_balance) } : {}),
    ...(row.interest_rate != null ? { interestRate: Number(row.interest_rate) } : {}),
    ...(row.term_months != null ? { termMonths: Number(row.term_months) } : {}),
    ...(row.payment_scheme ? { paymentScheme: row.payment_scheme as PaymentScheme } : {}),
    ...(row.property_name ? { propertyName: row.property_name } : {}),
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
