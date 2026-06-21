export type Currency = 'RUB' | 'USD' | 'EUR' | 'BYN' | 'KZT' | 'UAH' | 'AMD' | 'KGS' | 'UZS' | 'GEL';
export type DisplayCurrency = Currency;
export type BillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'one-time' | 'trial';

// 'date' = same calendar day each period (default, current behavior).
// 'days' = fixed-length period: monthly=30 days, quarterly=91 days.
// Some services (e.g. Apple, certain crypto subs) bill every 30 days,
// shifting the charge ~1 day earlier each calendar month.
export type CycleAnchor = 'date' | 'days';

// — Obligations (credits & mortgages) share the Subscription shape via `kind`. —
export type ObligationKind = 'subscription' | 'credit' | 'mortgage';
export type PaymentScheme = 'annuity' | 'differentiated';
export type LoanType = 'consumer' | 'auto' | 'installment' | 'debt' | 'mortgage';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  category: string;
  cycle: BillingCycle;
  cycleAnchor?: CycleAnchor; // optional, defaults to 'date' for legacy subs
  nextPaymentDate: string; // ISO date
  startDate: string;
  paymentMethod: string;
  notes: string;
  color: string; // hex цвет для карточки
  icon: string; // emoji
  managementUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // — Obligation discriminator (absent ⇒ 'subscription') —
  kind?: ObligationKind;
  // — Кредит / ипотека: price = ежемесячный платёж (cycle='monthly') —
  lender?: string;              // банк / кредитор
  loanType?: LoanType;
  principalAmount?: number;     // исходная сумма кредита
  outstandingBalance?: number;  // остаток долга (заголовочное число)
  interestRate?: number;        // ставка % годовых (0 = рассрочка)
  termMonths?: number;          // оставшийся срок в месяцах
  paymentScheme?: PaymentScheme;
  propertyName?: string;        // только для ипотеки: объект недвижимости
  workspaceId?: string; // если подписка принадлежит workspace
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  inviteToken: string;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  email?: string; // для отображения в UI
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface AppSettings {
  displayCurrency: DisplayCurrency;
  exchangeRate: number;     // курс USD/RUB (legacy — для миграции/совместимости)
  eurExchangeRate?: number; // курс EUR/RUB (legacy — falls back to 105)
  rates?: Partial<Record<Currency, number>>;       // эффективная карта RUB-за-единицу (источник конвертации)
  manualRates?: Partial<Record<Currency, number>>; // ручные оверрайды пользователя
  useManualRate: boolean;  // true = ручной курс, false = авто от ЦБ
  notificationsEnabled: boolean;
  notifyDaysBefore: number; // за сколько дней до платежа
  monthlyBudget?: number;      // PRO: месячный лимит расходов (0 = не задан)
  budgetCurrency?: DisplayCurrency; // валюта, в которой был введён бюджет
  enabledSections?: { credits: boolean; mortgages: boolean }; // subscriptions всегда вкл
}
