import type { Subscription, Category, AppSettings } from './types';
import { convertCurrency } from './utils';
import { resolveRates } from './currency';
import { CURRENCY_SYMBOLS } from './constants';
import { generateReportHtml } from './reportHtml';
import { getCategoryName, formatCycleLabel, formatReportDate } from './reportFormat';
import { APP_VERSION } from './version';

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

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportCSV(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): void {
  const isRu = lang === 'ru';
  const rates = resolveRates(settings);
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';

  const kindLabel = (sub: Subscription): string => {
    const k = sub.kind ?? 'subscription';
    if (k === 'credit') return isRu ? 'Кредит' : 'Credit';
    if (k === 'mortgage') return isRu ? 'Ипотека' : 'Mortgage';
    return isRu ? 'Подписка' : 'Subscription';
  };

  const headers = isRu
    ? ['Название', 'Тип', 'Категория', 'Сумма', 'Валюта', 'Цикл', 'Следующий платёж', 'Дата начала', 'Способ оплаты', 'Статус', 'Заметки', 'Банк/Кредитор', 'Остаток долга', 'Ставка %', 'Срок (мес)']
    : ['Name', 'Type', 'Category', 'Amount', 'Currency', 'Cycle', 'Next payment', 'Start date', 'Payment method', 'Status', 'Notes', 'Lender', 'Outstanding balance', 'Rate %', 'Term (months)'];

  const rows = subscriptions.map((sub) => {
    const converted = convertCurrency(
      sub.price, sub.currency, settings.displayCurrency, rates,
    );
    return [
      sub.name,
      kindLabel(sub),
      getCategoryName(sub, categories),
      `${converted} ${sym}`,
      settings.displayCurrency,
      formatCycleLabel(sub.cycle, isRu),
      formatReportDate(sub.nextPaymentDate, isRu),
      formatReportDate(sub.startDate, isRu),
      sub.paymentMethod || '—',
      sub.isActive ? (isRu ? 'Активна' : 'Active') : (isRu ? 'Неактивна' : 'Inactive'),
      sub.notes || '',
      sub.lender || '',
      sub.outstandingBalance != null ? String(sub.outstandingBalance) : '',
      sub.interestRate != null ? String(sub.interestRate) : '',
      sub.termMonths != null ? String(sub.termMonths) : '',
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

// ─── JSON backup ──────────────────────────────────────────────────────────────
// Mobile — and especially the Telegram WKWebView / iOS Safari — can't reliably
// "download" a blob: URL; it just opens the JSON as a page (no Save button). So:
//   • Telegram      → copy the backup to the clipboard (+ alert how to restore)
//   • other mobile  → native share sheet (Save to Files / Notes)
//   • desktop       → normal file download

export async function exportJSON(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): Promise<'downloaded' | 'copied' | 'shared' | 'failed'> {
  const isRu = lang === 'ru';
  const data = {
    subscriptions,
    categories,
    settings,
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
  };
  const json = JSON.stringify(data, null, 2);
  const filename = `subeasy-backup-${new Date().toISOString().split('T')[0]}.json`;

  // 1) Mobile (incl. iOS Telegram WKWebView) — the native share sheet is the only
  // reliable way to SAVE a file (→ Save to Files / Notes). Try it first.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (isMobileBrowser() && typeof nav.canShare === 'function') {
    const file = new File([json], filename, { type: 'application/json' });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'SubEasy backup' });
        return 'shared';
      } catch (e) {
        // AbortError = user closed the share sheet on purpose — respect it.
        if ((e as Error)?.name === 'AbortError') return 'shared';
        // any other failure → fall through to the next method
      }
    }
  }

  // 2) Telegram WebView without file-share support — copy to clipboard.
  if (isTelegramWebApp()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram.WebApp;
    try {
      await navigator.clipboard.writeText(json);
      tg.showAlert(
        isRu
          ? 'Резервная копия скопирована в буфер обмена. Сохраните её в заметку или файл .json — для восстановления вставьте её через «Импорт JSON».'
          : 'Backup copied to clipboard. Save it into a note or a .json file — to restore, paste it via "Import JSON".',
      );
      return 'copied';
    } catch {
      tg.showAlert(isRu ? 'Не удалось скопировать резервную копию.' : 'Failed to copy the backup.');
      return 'failed';
    }
  }

  // 3) Desktop (and fallback) — normal blob download.
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
