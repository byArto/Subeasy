export type Currency = 'RUB' | 'USD' | 'EUR';
export type DisplayCurrency = 'RUB' | 'USD' | 'EUR';
export type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'one-time' | 'trial';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  category: string;
  cycle: BillingCycle;
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
  exchangeRate: number;     // курс USD/RUB
  eurExchangeRate?: number; // курс EUR/RUB (optional — falls back to 105)
  useManualRate: boolean;  // true = ручной курс, false = авто от ЦБ
  notificationsEnabled: boolean;
  notifyDaysBefore: number; // за сколько дней до платежа
  monthlyBudget?: number;      // PRO: месячный лимит расходов (0 = не задан)
  budgetCurrency?: DisplayCurrency; // валюта, в которой был введён бюджет
}
