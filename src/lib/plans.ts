/**
 * Single source of truth for PRO plan pricing and expiry math.
 *
 * Previously the plan table (Stars / USD prices, payloads, durations) was
 * duplicated across the Telegram webhook, the TON webhook, create-invoice,
 * ton/create-payment and ProModal, and `calcProUntil` was implemented twice.
 * Keep all plan data here so a price change is a one-line edit.
 *
 * NOTE: PRO monetization is currently disabled (NEXT_PUBLIC_MONETIZATION_ENABLED=false);
 * this module feeds the dormant payment path and is the place to edit when it returns.
 */

export type PlanKey = 'monthly' | 'yearly' | 'lifetime';

export interface ProPlan {
  key: PlanKey;
  /** Telegram invoice payload identifier */
  payload: string;
  /** Telegram Stars price */
  stars: number;
  /** USD price (basis for TON conversion) */
  usd: number;
  /** Access duration in days; 0 = lifetime (no expiry) */
  days: number;
}

export const PRO_PLANS: Record<PlanKey, ProPlan> = {
  monthly:  { key: 'monthly',  payload: 'pro_monthly',  stars: 249,  usd: 2.99,  days: 30  },
  yearly:   { key: 'yearly',   payload: 'pro_yearly',   stars: 1799, usd: 19.99, days: 365 },
  lifetime: { key: 'lifetime', payload: 'pro_lifetime', stars: 2999, usd: 34.99, days: 0   },
};

export const PLAN_KEYS = Object.keys(PRO_PLANS) as PlanKey[];

const PLAN_BY_PAYLOAD: Record<string, ProPlan> = Object.fromEntries(
  PLAN_KEYS.map((k) => [PRO_PLANS[k].payload, PRO_PLANS[k]]),
);

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && value in PRO_PLANS;
}

export function isValidPayload(payload: unknown): boolean {
  return typeof payload === 'string' && payload in PLAN_BY_PAYLOAD;
}

/** Resolve a plan from either its key (`monthly`) or its payload (`pro_monthly`). */
export function resolvePlan(planOrPayload: string): ProPlan | null {
  return PRO_PLANS[planOrPayload as PlanKey] ?? PLAN_BY_PAYLOAD[planOrPayload] ?? null;
}

/**
 * Compute the new `pro_until` ISO timestamp after a purchase.
 * Extends from the later of now or the current expiry (so stacking purchases
 * adds time rather than resetting). Lifetime returns null (no expiry).
 * Returns the unchanged input for an unknown plan (caller should validate first).
 */
export function calcProUntil(planOrPayload: string, currentProUntil: string | null): string | null {
  const plan = resolvePlan(planOrPayload);
  if (!plan || plan.days === 0) return null;

  const now = new Date();
  const current = currentProUntil ? new Date(currentProUntil) : null;
  const base = current && current > now ? current : now;
  base.setDate(base.getDate() + plan.days);
  return base.toISOString();
}
