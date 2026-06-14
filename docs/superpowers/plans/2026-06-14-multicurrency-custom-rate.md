# Мультивалютность (CIS) + «Свой курс» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Component work должен следовать @react-best-practices.

**Goal:** Вернуть «Свой курс» в настройки и добавить корректно работающие валюты BYN, KZT, UAH, AMD, KGS, UZS, GEL (поверх RUB/USD/EUR).

**Architecture:** Переход с модели «два скалярных курса» на **карту «рублей за единицу»** (`Record<Currency, number>`, RUB=1). Конвертация = `amount × rates[from] / rates[to]`. Эффективная карта (`settings.rates`) — единый источник для конвертации и на клиенте, и на сервере; она синкается в Supabase. `/api/rate` берёт курсы с ЦБ с учётом `Nominal`. «Свой курс» = пер-валютные ручные оверрайды (`settings.manualRates`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4, Framer Motion, Supabase (Postgres + RLS), Vercel cron, CBR `cbr-xml-daily.ru`.

**Spec:** [docs/superpowers/specs/2026-06-14-multicurrency-custom-rate-design.md](../specs/2026-06-14-multicurrency-custom-rate-design.md)

---

## Заметки о верификации (важно)

- **В проекте нет тест-раннера** (scripts: `dev/build/start/lint`). Решение: **не добавляем** тест-фреймворк (вне объёма; репозиторий ходит через `npm run build` + ручной QA). Главный страж — **`npm run build`** (TypeScript): расширение union `Currency` заставляет `tsc` подсветить каждое место вызова, требующее правки. Дополнительно — ручная проверка в `npm run dev`. *Если хочешь юнит-тесты на конвертацию — скажи, добавлю vitest отдельной задачей.*
- **Ветка:** вся работа в `feat/multicurrency`. Коммиты — локально в ветку. **Не пушим в `main` и не мёржим без явной просьбы пользователя** (push в main = авто-деплой на Vercel на все 3 поверхности).
- **DB-миграция** (`rates jsonb`) применяется к Supabase отдельным подтверждаемым шагом (Task 7).

## File Structure

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `src/lib/currency.ts` | **создать** | Метаданные валют (`SUPPORTED_CURRENCIES`), `DEFAULT_RATES`, `resolveRates`, `computeEffectiveRates` |
| `src/lib/types.ts` | изменить | Расширить `Currency`/`DisplayCurrency`; добавить `rates`/`manualRates` в `AppSettings` |
| `src/lib/constants.ts` | изменить | `CURRENCY_SYMBOLS` (+7 валют); `DEFAULT_SETTINGS` без изменений |
| `src/lib/utils.ts` | изменить | `convertCurrency(amount, from, to, rates)` — карта вместо двух скаляров |
| `src/app/api/rate/route.ts` | изменить | Возврат полной карты курсов `Value/Nominal` |
| `src/lib/exchange-rate.ts` | изменить | Кеш карты курсов; миграция старого кеша |
| `src/hooks/useExchangeRate.ts` | изменить | Возврат карты авто-курсов |
| `src/hooks/useSettings.ts` | изменить | Нормализация/миграция настроек при чтении; `setManualRate` |
| `src/app/page.tsx` | изменить | Эффект записи `settings.rates`; вызовы конвертации |
| `src/components/settings/SettingsPage.tsx` | изменить | Список валют (без PRO) + «Свой курс» пер-валютно |
| `src/components/{subscription/SubDetail,subscription/SubForm,analytics/AnalyticsPage,calendar/CalendarPage,share/ShareCard}.tsx` | изменить | Перевод вызовов `convertCurrency` на карту |
| `src/hooks/useSubscriptions.ts`, `src/lib/{reportHtml,export,shareCanvas}.ts` | изменить | То же |
| `src/lib/sync.ts` | изменить | Синк `rates` (jsonb) |
| `src/app/api/cron/notify/route.ts`, `src/app/api/telegram/sendReport/route.ts` | изменить | Серверная конвертация через `rates` |
| `src/lib/translations.ts` | изменить | Имена валют + ярлык курса |
| `supabase/2026-06-14-add-rates-column.sql` | **создать** | Миграция `rates jsonb` |

---

## Task 0: Ветка

- [ ] **Step 1:** Создать рабочую ветку

```bash
cd /Users/byarto/Desktop/vibe/SubEasy/neonsub
git checkout -b feat/multicurrency
```

---

## Task 1: Ядро — карта курсов (метаданные, типы, конвертер, все вызовы)

> Атомарная задача: смена сигнатуры `convertCurrency` ломает всех потребителей до их обновления, поэтому правки делаются вместе и проверяются одним билдом. `tsc` подсветит все места.

**Files:**
- Create: `src/lib/currency.ts`
- Modify: `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/utils.ts`, и все потребители `convertCurrency`

- [ ] **Step 1: Создать `src/lib/currency.ts`**

```ts
import type { Currency, AppSettings } from './types';

export interface CurrencyMeta {
  code: Currency;
  symbol: string;
  cbr: string | null; // CBR CharCode; null = база (RUB)
  nameKey: string;    // ключ i18n
}

// Порядок = порядок отображения в пикере.
export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'RUB', symbol: '₽',   cbr: null,  nameKey: 'currency.name.RUB' },
  { code: 'USD', symbol: '$',   cbr: 'USD', nameKey: 'currency.name.USD' },
  { code: 'EUR', symbol: '€',   cbr: 'EUR', nameKey: 'currency.name.EUR' },
  { code: 'BYN', symbol: 'Br',  cbr: 'BYN', nameKey: 'currency.name.BYN' },
  { code: 'KZT', symbol: '₸',   cbr: 'KZT', nameKey: 'currency.name.KZT' },
  { code: 'UAH', symbol: '₴',   cbr: 'UAH', nameKey: 'currency.name.UAH' },
  { code: 'AMD', symbol: '֏',   cbr: 'AMD', nameKey: 'currency.name.AMD' },
  { code: 'KGS', symbol: 'сом', cbr: 'KGS', nameKey: 'currency.name.KGS' },
  { code: 'UZS', symbol: 'сўм', cbr: 'UZS', nameKey: 'currency.name.UZS' },
  { code: 'GEL', symbol: '₾',   cbr: 'GEL', nameKey: 'currency.name.GEL' },
];

export const ALL_CURRENCIES: Currency[] = SUPPORTED_CURRENCIES.map((c) => c.code);

// Список CBR CharCode для запроса в /api/rate.
export const CBR_CODES: string[] = SUPPORTED_CURRENCIES
  .map((c) => c.cbr)
  .filter((c): c is string => c !== null);

// RUB за 1 единицу — фоллбэк до первого ответа ЦБ / при сбое. Обновляется live.
export const DEFAULT_RATES: Record<Currency, number> = {
  RUB: 1, USD: 96, EUR: 105, BYN: 30, KZT: 0.19,
  UAH: 2.4, AMD: 0.25, KGS: 1.1, UZS: 0.0078, GEL: 35,
};

/** Полная карта RUB-за-единицу для конвертации: settings.rates поверх дефолтов; RUB=1. */
export function resolveRates(settings: Pick<AppSettings, 'rates'>): Record<Currency, number> {
  const out: Record<Currency, number> = { ...DEFAULT_RATES };
  const r = settings.rates;
  if (r) {
    for (const k of ALL_CURRENCIES) {
      const v = r[k];
      if (typeof v === 'number' && v > 0) out[k] = v;
    }
  }
  out.RUB = 1;
  return out;
}

/** Эффективная карта = ручные оверрайды (если включены) поверх авто-курсов. */
export function computeEffectiveRates(
  autoRates: Partial<Record<Currency, number>>,
  manualRates: Partial<Record<Currency, number>> | undefined,
  useManual: boolean,
): Record<Currency, number> {
  const out: Record<Currency, number> = { ...DEFAULT_RATES };
  for (const k of ALL_CURRENCIES) {
    const v = autoRates[k];
    if (typeof v === 'number' && v > 0) out[k] = v;
  }
  if (useManual && manualRates) {
    for (const k of ALL_CURRENCIES) {
      const v = manualRates[k];
      if (typeof v === 'number' && v > 0) out[k] = v;
    }
  }
  out.RUB = 1;
  return out;
}
```

- [ ] **Step 2: `src/lib/types.ts` — расширить union и `AppSettings`**

Заменить строки 1-2:

```ts
export type Currency = 'RUB' | 'USD' | 'EUR' | 'BYN' | 'KZT' | 'UAH' | 'AMD' | 'KGS' | 'UZS' | 'GEL';
export type DisplayCurrency = Currency;
```

В `AppSettings` (после `eurExchangeRate`) добавить:

```ts
  rates?: Partial<Record<Currency, number>>;       // эффективная карта RUB-за-единицу (источник конвертации)
  manualRates?: Partial<Record<Currency, number>>; // ручные оверрайды пользователя
```

(`exchangeRate`, `eurExchangeRate`, `useManualRate` оставить — нужны для миграции/совместимости.)

- [ ] **Step 3: `src/lib/constants.ts` — символы валют**

Заменить объект `CURRENCY_SYMBOLS` на:

```ts
export const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽', USD: '$', EUR: '€', BYN: 'Br', KZT: '₸',
  UAH: '₴', AMD: '֏', KGS: 'сом', UZS: 'сўм', GEL: '₾',
};
```

- [ ] **Step 4: `src/lib/utils.ts` — переписать `convertCurrency`**

Добавить импорт вверху: `import { DEFAULT_RATES } from './currency';`
Заменить функцию `convertCurrency` (строки 26-50) на:

```ts
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? DEFAULT_RATES[from];
  const toRate = rates[to] ?? DEFAULT_RATES[to];
  const rubAmount = amount * fromRate;
  return Math.round((rubAmount / toRate) * 100) / 100;
}
```

- [ ] **Step 5: Обновить все вызовы `convertCurrency` на карту**

Импортировать `resolveRates` из `@/lib/currency` в каждом файле и заменить последний(ие) аргумент(ы):

- `src/components/calendar/CalendarPage.tsx:134` — `settings.exchangeRate` → `resolveRates(settings)`
- `src/components/subscription/SubDetail.tsx:228` — `settings.exchangeRate` → `resolveRates(settings)`
- `src/components/subscription/SubForm.tsx:340` — `settings.exchangeRate` → `resolveRates(settings)`
- `src/components/share/ShareCard.tsx:42` и `src/lib/shareCanvas.ts:157` — параметр `exchangeRate: number` заменить на `rates: Record<Currency, number>` (прокинуть от вызывающего; вызывающий передаёт `resolveRates(settings)`)
- `src/lib/reportHtml.ts:17-28` — убрать `eurRate`; передавать `resolveRates(settings)`
- `src/lib/export.ts:29-39` — то же
- `src/hooks/useSubscriptions.ts:81-86` — `getTotalMonthly(currency, rate: number)` → `getTotalMonthly(currency, rates: Record<Currency, number>)`; вызов внутри использует `rates`
- `src/components/analytics/AnalyticsPage.tsx` — `getMonthlyInCurrency`, `getMonthlyTotal` принимают `rates: Record<Currency, number>` вместо `rate: number`; переменную `exchangeRate` (строка ~245) заменить на `resolveRates(settings)` map
- `src/app/page.tsx` — `getTotalMonthlyActive`/`getTotalYearlyActive` принимают `rates: Record<Currency, number>`; вызов на строке 785 — `resolveRates(settings)` вместо `exchangeRate`

> Везде, где `Currency` ещё не импортирован, добавить импорт типа. `tsc` укажет любые пропущенные места.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS, без ошибок типов. (Если падает — обновить указанное место под новую сигнатуру.)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(currency): rate-map core — generalize convertCurrency to N currencies"
```

---

## Task 2: `/api/rate` — полная карта с учётом Nominal

**Files:** Modify `src/app/api/rate/route.ts`

- [ ] **Step 1: Переписать тело `try`** — собрать карту из всех `CBR_CODES`, деля на `Nominal`:

```ts
import { CBR_CODES } from '@/lib/currency';
// ...
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' });
    const data = await res.json();
    const valute = data?.Valute ?? {};
    const rates: Record<string, number> = {};
    for (const code of CBR_CODES) {
      const v = valute[code];
      if (v && typeof v.Value === 'number' && typeof v.Nominal === 'number' && v.Nominal > 0) {
        rates[code] = Math.round((v.Value / v.Nominal) * 1e6) / 1e6;
      }
    }
    return new Response(
      // rate/eurRate — для совместимости со старыми закешированными клиентами
      JSON.stringify({ rates, rate: rates.USD ?? null, eurRate: rates.EUR ?? null }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
```

В `catch` вернуть `{ rates: null, rate: null, eurRate: null }` со статусом 500.

- [ ] **Step 2: Verify** — `npm run build`; затем `npm run dev` и `curl -s localhost:3000/api/rate` — в ответе есть `rates` с USD/EUR/BYN/KZT и т.д., значения правдоподобны (KZT ≈ 0.1–0.2, не 15–19).
- [ ] **Step 3: Commit** — `git commit -am "feat(api/rate): return full RUB-per-unit map with Nominal"`

---

## Task 3: Кеш курса + хук + запись эффективной карты в settings

**Files:** Modify `src/lib/exchange-rate.ts`, `src/hooks/useExchangeRate.ts`, `src/app/page.tsx`

- [ ] **Step 1: `exchange-rate.ts`** — кешировать карту:
  - Тип кеша: `{ rates: Partial<Record<Currency, number>>; fetchedAt: string; source: 'cbr' }`.
  - `fetchCBRRates()` возвращает `Partial<Record<Currency, number>>` (из `data.rates`; фоллбэк — прямой fetch ЦБ с тем же `Value/Nominal`-расчётом по `CBR_CODES`).
  - **Миграция старого кеша:** при чтении, если есть legacy `{rate, eurRate}` без `rates` — преобразовать в `{ USD: rate, EUR: eurRate }`.
  - `getExchangeRate()/refreshExchangeRate()` возвращают `Partial<Record<Currency, number>>`; `getRateInfo()` — `{ rates, updatedAt, isStale }`.
- [ ] **Step 2: `useExchangeRate.ts`** — сигнатура `useExchangeRate(initial: Partial<Record<Currency, number>>)`; возвращает `{ rates, lastUpdated, isLoading, refresh }`.
- [ ] **Step 3: `page.tsx`** — заменить деструктуризацию (строки 265-271) на `rates: autoRates`; заменить эффект синка авто-курса (строки 274-281) на запись эффективной карты:

```ts
import { computeEffectiveRates } from '@/lib/currency';
// ...
useEffect(() => {
  const eff = computeEffectiveRates(autoRates, settings.manualRates, settings.useManualRate);
  const cur = settings.rates ?? {};
  const changed = (Object.keys(eff) as Currency[]).some((k) => eff[k] !== cur[k]);
  if (changed) updateSettings({ rates: eff });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [autoRates, settings.manualRates, settings.useManualRate]);
```

  Передать в `<SettingsPage>` проп `rateLastUpdated`/`rateIsLoading`/`onRefreshRate` как сейчас.
- [ ] **Step 4: Verify** — `npm run build`; в `npm run dev` проверить: на главной итоги считаются, при переключении валюты суммы пересчитываются.
- [ ] **Step 5: Commit** — `git commit -am "feat(currency): cache & propagate full rate map; write effective settings.rates"`

---

## Task 4: UI настроек — список валют (без PRO) + «Свой курс» пер-валютно

**Files:** Modify `src/components/settings/SettingsPage.tsx`

Следовать @react-best-practices (мемо/коллбэки, без инлайн-объектов в пропсах, стабильные ключи) и правилам Framer Motion из CLAUDE.md.

- [ ] **Step 1:** Заменить `CurrencySwitch` (строки 1994-2031) на `CurrencyList` — раскрывающийся список в стиле секции «Язык» (символ + переведённое имя + галочка активной), маппинг по `SUPPORTED_CURRENCIES`. **Без** `isPro`/`onOpenPro`/`locked`. Импортировать `SUPPORTED_CURRENCIES` из `@/lib/currency`.
- [ ] **Step 2:** Удалить из вызова на строке 653 пропсы `isPro`/`onOpenPro`; убрать старый `CURRENCY_OPTIONS`.
- [ ] **Step 3:** В секции «Валюта» (строки 646-700) восстановить блок «Свой курс»:
  - Тумблер `NeonToggle` → `updateSettings({ useManualRate: !settings.useManualRate })`. Подписи `t('settings.currency.customRate')` / `t('settings.currency.customRateHint')`.
  - При `useManualRate` — список полей по **используемым валютам**: `const used = Array.from(new Set([settings.displayCurrency, ...subscriptions.map(s => s.currency)])).filter(c => c !== 'RUB')`. Для каждой — строка `1 {symbol} = [input] ₽`, значение `settings.manualRates?.[code] ?? resolveRates(settings)[code]`, onChange (валидное число > 0) → `updateSettings({ manualRates: { ...settings.manualRates, [code]: v } })`.
  - При `!useManualRate` — показывать авто-курс ЦБ + кнопку refresh (как сейчас). Строку «1$=…₽ · 1€=…₽» заменить на курс валюты отображения (или RUB→USD по умолчанию), читая из `resolveRates(settings)`.
- [ ] **Step 4: Verify** — `npm run build`; ручной QA в `npm run dev`:
  - Открыть Настройки → Валюта: виден список из 10 валют, переключение меняет суммы на главной/аналитике.
  - Включить «Свой курс» → появляются поля для используемых валют; правка курса меняет суммы; выключение возвращает курс ЦБ.
- [ ] **Step 5: Commit** — `git commit -am "feat(settings): currency list (no PRO) + per-currency custom rate"`

---

## Task 5: i18n — имена валют и ярлык курса

**Files:** Modify `src/lib/translations.ts`

- [ ] **Step 1:** Добавить ключи `currency.name.RUB … GEL` (`{ ru, en }`, следуя существующей структуре файла) и обобщённый `settings.currency.rateToRub` (ru: «Курс к рублю», en: «Rate to RUB»), если используется в UI. Существующие `customRate`/`customRateHint`/`cbrf` переиспользовать.
- [ ] **Step 2: Verify** — `npm run build`; в dev имена валют отображаются на RU и EN.
- [ ] **Step 3: Commit** — `git commit -am "feat(i18n): currency names + rate label"`

---

## Task 6: Серверный паритет — sync + cron + Telegram-отчёт

**Files:** Modify `src/lib/sync.ts`, `src/app/api/cron/notify/route.ts`, `src/app/api/telegram/sendReport/route.ts`

- [ ] **Step 1: `sync.ts`** — `pushSettings`: добавить `rates: settings.rates ?? null`. `pullSettings`: `rates: data.rates ?? undefined`. Старые колонки оставить.
- [ ] **Step 2: `cron/notify/route.ts`** — в `select` добавить `rates`; построить карту: `const rates = settings.rates ?? { USD: usdRate, EUR: eurRate }` (фоллбэк). Переписать `convertPrice` (строки 27-32) на формулу через карту RUB-за-единицу (RUB=1). `buildMessage` принимает `rates`.
- [ ] **Step 3: `telegram/sendReport/route.ts`** — аналогично: читать `rates`, конвертировать через карту (использует `reportHtml.ts`, уже переведённый в Task 1 — прокинуть `rates`).
- [ ] **Step 4: Verify** — `npm run build`.
- [ ] **Step 5: Commit** — `git commit -am "feat(server): convert via rate map in cron + telegram report"`

---

## Task 7: Миграция БД + миграция legacy-настроек + финальный QA

**Files:** Create `supabase/2026-06-14-add-rates-column.sql`; Modify `src/hooks/useSettings.ts`

- [ ] **Step 1:** Создать SQL-миграцию:

```sql
-- Добавляет карту эффективных курсов (RUB за единицу) к настройкам пользователя.
alter table public.user_settings
  add column if not exists rates jsonb;
```

- [ ] **Step 2 (manual, требует подтверждения пользователя):** Применить миграцию к Supabase (SQL Editor или MCP `apply_migration`). RLS на `user_settings` не меняем. **Подтвердить у пользователя перед применением.**
- [ ] **Step 3: `useSettings.ts`** — нормализатор при чтении (на initial value из `useLocalStorage`): если `manualRates` отсутствует, но `useManualRate === true` и есть `exchangeRate` — засеять `manualRates = { USD: exchangeRate, EUR: eurExchangeRate ?? 105 }`; если `rates` отсутствует — засеять `rates = { USD: exchangeRate, EUR: eurExchangeRate ?? 105 }`. Добавить `setManualRate(code, rate)` коллбэк (опционально — если не используем инлайн `updateSettings`). Обновить `CURRENCY_CYCLE` до `ALL_CURRENCIES` (или удалить неиспользуемый `toggleCurrency`).
- [ ] **Step 4: Финальный QA** — `npm run build`; в `npm run dev` пройти чеклист из спеки (Критерии готовности): все 10 валют, отсутствие 100×-ошибок (проверить KZT/AMD/UZS), «Свой курс» вкл/выкл, бюджет в аналитике, экспорт CSV/PDF, шеринг-карточка. Проверить, что старые настройки (только `exchangeRate`/`eurExchangeRate`) не ломают приложение.
- [ ] **Step 5: Commit** — `git commit -am "feat(currency): DB rates column + legacy settings migration"`

---

## Execution Handoff (после ревью плана)

- Финальная версия для коммита/бампа — предложить `1.8.0` (фича) согласно формату `vX.Y.Z`, но **бамп версии и любой push/merge в `main` — только по явной просьбе пользователя**.
- Готовый функционал — на ветке `feat/multicurrency`; деплой = пользователь решает, когда мёржить/пушить.
