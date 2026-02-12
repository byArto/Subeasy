export type Currency = 'RUB' | 'USD' | 'EUR';
export type DisplayCurrency = 'RUB' | 'USD';
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface AppSettings {
  displayCurrency: DisplayCurrency;
  exchangeRate: number; // курс RUB/USD
  useManualRate: boolean; // true = ручной курс, false = авто от ЦБ
  notificationsEnabled: boolean;
  notifyDaysBefore: number; // за сколько дней до платежа
}
