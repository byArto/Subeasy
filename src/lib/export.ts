import type { Subscription, Category, AppSettings } from './types';
import { convertCurrency, getMonthlyPrice } from './utils';
import { CURRENCY_SYMBOLS } from './constants';
import { generateReportHtml } from './reportHtml';

// ─── Environment ──────────────────────────────────────────────────────────────

function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Telegram?.WebApp?.initData;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryName(sub: Subscription, categories: Category[]): string {
  return categories.find((c) => c.id === sub.category)?.name ?? sub.category;
}

function formatCycleLabel(cycle: string, isRu: boolean): string {
  const labels: Record<string, [string, string]> = {
    monthly:   ['Ежемесячно', 'Monthly'],
    yearly:    ['Ежегодно',   'Yearly'],
    weekly:    ['Еженедельно','Weekly'],
    'one-time':['Разовый',   'One-time'],
    trial:     ['Пробный',   'Trial'],
  };
  const pair = labels[cycle];
  return pair ? pair[isRu ? 0 : 1] : cycle;
}

function formatDate(iso: string, isRu: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportCSV(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): void {
  const isRu = lang === 'ru';
  const eurRate = settings.eurExchangeRate ?? 105;
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';

  const headers = isRu
    ? ['Название', 'Категория', 'Сумма', 'Валюта', 'Цикл', 'Следующий платёж', 'Дата начала', 'Способ оплаты', 'Статус', 'Заметки']
    : ['Name', 'Category', 'Amount', 'Currency', 'Cycle', 'Next payment', 'Start date', 'Payment method', 'Status', 'Notes'];

  const rows = subscriptions.map((sub) => {
    const converted = convertCurrency(
      sub.price, sub.currency, settings.displayCurrency,
      settings.exchangeRate, eurRate,
    );
    return [
      sub.name,
      getCategoryName(sub, categories),
      `${converted} ${sym}`,
      settings.displayCurrency,
      formatCycleLabel(sub.cycle, isRu),
      formatDate(sub.nextPaymentDate, isRu),
      formatDate(sub.startDate, isRu),
      sub.paymentMethod || '—',
      sub.isActive ? (isRu ? 'Активна' : 'Active') : (isRu ? 'Неактивна' : 'Inactive'),
      sub.notes || '',
    ];
  });

  // Comma separator — universally compatible (Excel, Google Sheets, iOS, Numbers)
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\r\n');

  if (isTelegramWebApp()) {
    // Telegram WKWebView can't open blob: URLs — copy to clipboard instead
    navigator.clipboard.writeText('\uFEFF' + csv).then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Telegram.WebApp.showAlert(
        isRu
          ? 'CSV скопирован в буфер обмена. Вставьте в Excel или Google Sheets.'
          : 'CSV copied to clipboard. Paste into Excel or Google Sheets.',
      );
    }).catch(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Telegram.WebApp.showAlert(
        isRu ? 'Не удалось скопировать CSV.' : 'Failed to copy CSV.',
      );
    });
    return;
  }

  // UTF-8 BOM — Excel / Numbers on macOS/iOS open Cyrillic correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subeasy-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── PDF via HTML Print ───────────────────────────────────────────────────────
// Uses browser's native print/PDF — supports Cyrillic, all Unicode, system fonts.
// On iOS: share sheet → Print → Save to Files as PDF.
// On desktop: Ctrl+P → Save as PDF.

export function exportPDF(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): string | void {
  const html = generateReportHtml(subscriptions, categories, settings, lang);

  if (isTelegramWebApp() || isMobileBrowser()) {
    // Telegram WKWebView can't open blob: URLs; mobile browsers can't save blob: tabs —
    // return HTML string so the caller shows the in-app overlay with a Share button
    return html;
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ─── HTML escape ─────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
