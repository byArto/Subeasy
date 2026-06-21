# Кредиты и Ипотека — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в SubEasy настраиваемые разделы «Кредиты» и «Ипотека» (опт-ин в настройках, переключатель-пилюли наверху) с полным графиком платежей (амортизация), переиспользуя существующую модель данных, синк и UI-кит.

**Architecture:** Расширяем существующий тип `Subscription` дискриминатором `kind` и опциональными полями кредита (без отдельных таблиц/ключей localStorage). Денежный месячный платёж кредита хранится в существующем `price` + `cycle:'monthly'`, поэтому итоги/календарь/напоминания работают **без переписывания**. Вся «новая математика» (аннуитет/дифференц., график, переплата) — в чистом модуле `loanUtils.ts` с юнит-тестами. Навигация — переключатель режимов (`appMode`) в `page.tsx`, без изменения нижнего таб-бара. Тема — главная светлая `claude`; все новые компоненты на токенах.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (CSS-токены) · Framer Motion · Supabase (offline-first, localStorage-primary) · тесты — `node:test` + `jiti` (нет `npm test`).

**Спек:** [docs/superpowers/specs/2026-06-21-credits-mortgages-design.md](../specs/2026-06-21-credits-mortgages-design.md)
**Визуальный референс:** `SubEasy/mockups/credits-concept/index.html` (вне репо, локально на :4599).

---

## Ключевые решения реализации (отличия/уточнения к спеку)

1. **Не вводим отдельный тип/таблицу/ключ.** Расширяем `Subscription` (он же `Obligation`) опциональными полями + `kind`. Существующий код не трогаем — все новые поля опциональны.
2. **Месячный платёж кредита = существующее поле `price`** (при `cycle:'monthly'`). Это даёт бесплатно: `getMonthlyPrice`, итоги, календарь, напоминания. Отдельного `monthlyPayment` НЕ заводим — в плане это синоним `price`.
3. **`outstandingBalance` (остаток долга)** и остальные параметры кредита — новые опциональные поля.
4. **Разделы**: `subscriptions` всегда включён; `credits`/`mortgages` — опт-ин в `AppSettings.enabledSections`. Пилюли показываются, когда включён хотя бы один доп-раздел.
5. **UI кредитов — отдельные компоненты** (`LoanList`/`LoanCard`/`LoanForm`/`LoanDetail`), а не ветвление в гигантском `SubForm` (1300 строк) — ниже риск, чище. Подписочный путь не трогаем.
6. **TDD только для чистой логики** (`loanUtils`, мапперы) — в проекте нет раннера компонентных тестов. UI-задачи верифицируются `npm run build` + ручной проверкой на :3000 (пользователь проверяет локально).

---

## File Structure

**Создаём:**
- `src/lib/loanUtils.ts` — амортизация (аннуитет/дифференц.), график, переплата, прогресс, дата погашения.
- `src/lib/loanUtils.test.mjs` — юнит-тесты (node:test + jiti).
- `src/lib/obligations.ts` — хелперы `getKind`/`isLoan`/`emptyLoan` + типы режимов.
- `src/components/layout/ModeSwitch.tsx` — пилюли переключения режима.
- `src/components/settings/SectionsSettings.tsx` — блок «Разделы» с тумблерами.
- `src/components/loan/LoanCard.tsx` — карточка кредита/ипотеки.
- `src/components/loan/LoanList.tsx` — список + пустое состояние.
- `src/components/loan/LoanForm.tsx` — форма добавления/редактирования.
- `src/components/loan/LoanDetail.tsx` — деталь + график платежей + досрочный платёж.
- `src/components/loan/AmortizationTable.tsx` — таблица графика (год→месяцы).

**Модифицируем:**
- `src/lib/types.ts` — поля кредита + `kind` + `enabledSections`.
- `src/lib/constants.ts` — `DEFAULT_SETTINGS.enabledSections`.
- `src/lib/dbMappers.ts` — `SubscriptionRow`/`dbToSubscription` (kind, cycle_anchor, поля кредита).
- `src/lib/sync.ts` — `subscriptionToDb` (kind, cycle_anchor, поля кредита) + settings pull/push (`enabled_sections`).
- `src/app/page.tsx` — `appMode`, фильтрация по kind, рендер `ModeSwitch`, модалки кредита, FAB-режим.
- `src/components/settings/SettingsPage.tsx` — вставка `SectionsSettings`.
- `src/lib/translations.ts` — ключи RU/EN.
- `supabase/2026-06-21-add-obligation-columns.sql` — миграция (новый файл, но раздел БД).

---

## Phase 1 — Foundation (модель данных, математика, синк)

### Task 1: Расширить типы

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Добавить типы и поля.** В `src/lib/types.ts` добавить после строки с `CycleAnchor`:

```ts
export type ObligationKind = 'subscription' | 'credit' | 'mortgage';
export type PaymentScheme = 'annuity' | 'differentiated';
export type LoanType = 'consumer' | 'auto' | 'installment' | 'debt' | 'mortgage';
```

И расширить интерфейс `Subscription` (все поля опциональны, существующий код не ломается). Добавить внутрь `interface Subscription { ... }` перед `workspaceId?`:

```ts
  // — Obligation discriminator (absent ⇒ 'subscription') —
  kind?: ObligationKind;
  // — Кредит / ипотека (price = ежемесячный платёж, cycle='monthly') —
  lender?: string;              // банк / кредитор
  loanType?: LoanType;
  principalAmount?: number;     // исходная сумма кредита
  outstandingBalance?: number;  // остаток долга (заголовочное число)
  interestRate?: number;        // ставка % годовых (0 = рассрочка)
  termMonths?: number;          // оставшийся срок в месяцах
  paymentScheme?: PaymentScheme;
  propertyName?: string;        // только для ипотеки: объект недвижимости
```

И расширить `interface AppSettings { ... }`, добавив:

```ts
  enabledSections?: { credits: boolean; mortgages: boolean }; // subscriptions всегда вкл
```

- [ ] **Step 2: Проверить компиляцию.** Run: `npx tsc --noEmit` (из `neonsub/`). Expected: без новых ошибок (все добавленные поля опциональны).

- [ ] **Step 3: Commit.**
```bash
git add src/lib/types.ts
git commit -m "feat: add obligation kind + loan fields + enabledSections to types"
```

---

### Task 2: loanUtils.ts (амортизация) — TDD

**Files:**
- Create: `src/lib/loanUtils.ts`
- Test: `src/lib/loanUtils.test.mjs`

- [ ] **Step 1: Написать падающий тест.** Создать `src/lib/loanUtils.test.mjs` (паттерн как `syncMerge.test.mjs`):

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(fileURLToPath(import.meta.url));
const { annuityPayment, buildSchedule, summarizeLoan, loanProgressPct } = jiti('./loanUtils.ts');

test('annuity payment matches the standard formula', () => {
  // 100000 @ 12%/year, 12 months → ≈ 8884.88
  assert.ok(Math.abs(annuityPayment(100000, 12, 12) - 8884.88) < 0.5);
});

test('zero-rate annuity is balance / term', () => {
  assert.equal(annuityPayment(12000, 0, 12), 1000);
});

test('annuity schedule fully amortizes to ~0', () => {
  const rows = buildSchedule({ balance: 100000, annualRatePct: 12, termMonths: 12, scheme: 'annuity', startDate: '2026-07-01' });
  assert.equal(rows.length, 12);
  assert.ok(rows[rows.length - 1].balance < 1);
});

test('differentiated schedule has equal principal and declining payments', () => {
  const rows = buildSchedule({ balance: 120000, annualRatePct: 12, termMonths: 12, scheme: 'differentiated', startDate: '2026-07-01' });
  assert.equal(rows[0].payment, 11200); // 10000 principal + 1200 interest
  assert.equal(rows[1].payment, 11100); // 10000 principal + 1100 interest
  assert.ok(rows[0].payment > rows[11].payment);
  assert.ok(rows[rows.length - 1].balance < 1);
});

test('summarizeLoan returns payoff date and total interest', () => {
  const input = { balance: 100000, annualRatePct: 12, termMonths: 12, scheme: 'annuity', startDate: '2026-07-01' };
  const s = summarizeLoan(input);
  assert.equal(s.remainingPayments, 12);
  assert.equal(s.payoffDate, '2027-06-01');
  assert.ok(s.totalInterest > 0);
});

test('progress percent from principal and outstanding', () => {
  assert.equal(loanProgressPct(500000, 340000), 32);
  assert.equal(loanProgressPct(0, 0), 0);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает.** Run: `node src/lib/loanUtils.test.mjs`. Expected: FAIL (`Cannot find module './loanUtils.ts'`).

- [ ] **Step 3: Реализовать `src/lib/loanUtils.ts`:**

```ts
export type PaymentScheme = 'annuity' | 'differentiated';

export interface ScheduleRow {
  index: number;     // 1-based номер платежа
  date: string;      // ISO YYYY-MM-DD
  payment: number;   // платёж за месяц
  principal: number; // тело долга
  interest: number;  // проценты
  balance: number;   // остаток ПОСЛЕ платежа
}

export interface LoanInput {
  balance: number;          // текущий остаток долга
  annualRatePct: number;    // ставка % годовых (0 = рассрочка)
  termMonths: number;       // оставшийся срок в месяцах
  scheme: PaymentScheme;
  startDate: string;        // ISO дата первого платежа графика
  monthlyPayment?: number;  // ручной оверрайд для аннуитета
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Стандартный аннуитетный платёж. При ставке 0 → остаток / срок. */
export function annuityPayment(balance: number, annualRatePct: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return round2(balance / termMonths);
  const pow = Math.pow(1 + r, termMonths);
  return round2((balance * r * pow) / (pow - 1));
}

function addMonths(iso: string, months: number): string {
  // Локальный разбор (без UTC-сдвига) + клампинг дня к длине месяца,
  // чтобы платежи на 29–31 число у многолетней ипотеки не перескакивали месяц.
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, (m - 1) + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  const yy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Полный график амортизации для любой схемы. */
export function buildSchedule(input: LoanInput): ScheduleRow[] {
  const { balance, annualRatePct, termMonths, scheme, startDate } = input;
  const r = annualRatePct / 100 / 12;
  const rows: ScheduleRow[] = [];
  let bal = balance;
  if (termMonths <= 0 || bal <= 0) return rows;

  const fixedPrincipal = round2(bal / termMonths); // дифференц.
  const annuity = input.monthlyPayment && input.monthlyPayment > 0
    ? input.monthlyPayment
    : annuityPayment(bal, annualRatePct, termMonths);

  for (let i = 1; i <= termMonths && bal > 0.005; i++) {
    const interest = round2(bal * r);
    let principal: number;
    let payment: number;
    if (scheme === 'differentiated') {
      principal = Math.min(fixedPrincipal, bal);
      payment = round2(principal + interest);
    } else {
      payment = Math.min(annuity, round2(bal + interest));
      principal = round2(payment - interest);
      if (principal > bal) { principal = bal; payment = round2(bal + interest); }
    }
    bal = round2(bal - principal);
    rows.push({ index: i, date: addMonths(startDate, i - 1), payment, principal, interest, balance: Math.max(0, bal) });
  }
  return rows;
}

export interface LoanSummary {
  payoffDate: string | null;
  totalInterest: number;   // переплата (Σ процентов по оставшемуся графику)
  remainingPayments: number;
  monthlyPayment: number;  // платёж первого месяца
}

export function summarizeLoan(input: LoanInput): LoanSummary {
  const rows = buildSchedule(input);
  return {
    payoffDate: rows.length ? rows[rows.length - 1].date : null,
    totalInterest: round2(rows.reduce((s, row) => s + row.interest, 0)),
    remainingPayments: rows.length,
    monthlyPayment: rows.length ? rows[0].payment : 0,
  };
}

/** Прогресс 0..100 — сколько тела долга погашено. */
export function loanProgressPct(principalAmount: number, outstandingBalance: number): number {
  if (!principalAmount || principalAmount <= 0) return 0;
  const paid = principalAmount - outstandingBalance;
  return Math.max(0, Math.min(100, Math.round((paid / principalAmount) * 100)));
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что зелёные.** Run: `node src/lib/loanUtils.test.mjs`. Expected: PASS (6 tests).

- [ ] **Step 5: Убедиться, что `jiti` объявлена.** Run: `node -e "require('jiti')" 2>&1 | head -1`. Если ошибка — `npm i -D jiti`. Затем проверить, что `jiti` есть в `package.json` `devDependencies` (сейчас резолвится транзитивно — закрепить явно).

- [ ] **Step 6: Commit.**
```bash
git add src/lib/loanUtils.ts src/lib/loanUtils.test.mjs package.json package-lock.json
git commit -m "feat: add loanUtils amortization (annuity + differentiated) with tests"
```

---

### Task 3: Расширить мапперы БД↔приложение

**Files:**
- Modify: `src/lib/dbMappers.ts`

- [ ] **Step 1: Расширить `SubscriptionRow`** — добавить поля после `workspace_id`:
```ts
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
```

- [ ] **Step 2: Расширить `dbToSubscription`** — внутри возвращаемого объекта, перед `...(row.workspace_id ? ...)`, добавить (используя «не добавлять undefined» паттерн как у `workspaceId`):
```ts
    ...(row.cycle_anchor ? { cycleAnchor: row.cycle_anchor as import('./types').CycleAnchor } : {}),
    ...(row.kind ? { kind: row.kind as import('./types').ObligationKind } : {}),
    ...(row.lender ? { lender: row.lender } : {}),
    ...(row.loan_type ? { loanType: row.loan_type as import('./types').LoanType } : {}),
    ...(row.principal_amount != null ? { principalAmount: Number(row.principal_amount) } : {}),
    ...(row.outstanding_balance != null ? { outstandingBalance: Number(row.outstanding_balance) } : {}),
    ...(row.interest_rate != null ? { interestRate: Number(row.interest_rate) } : {}),
    ...(row.term_months != null ? { termMonths: Number(row.term_months) } : {}),
    ...(row.payment_scheme ? { paymentScheme: row.payment_scheme as import('./types').PaymentScheme } : {}),
    ...(row.property_name ? { propertyName: row.property_name } : {}),
```

- [ ] **Step 3: Проверить компиляцию.** Run: `npx tsc --noEmit`. Expected: чисто.

- [ ] **Step 4: Commit.**
```bash
git add src/lib/dbMappers.ts
git commit -m "feat: map kind, cycle_anchor and loan columns in dbToSubscription"
```

---

### Task 4: Запись новых полей при синке + `cycle_anchor`

**Files:**
- Modify: `src/lib/sync.ts`

- [ ] **Step 1: Расширить `subscriptionToDb`** (после строки `updated_at: safeTimestamp(...)`, перед закрывающей `};`):
```ts
    cycle_anchor: s.cycleAnchor ?? null,
    kind: s.kind ?? 'subscription',
    lender: s.lender ?? null,
    loan_type: s.loanType ?? null,
    principal_amount: Number.isFinite(Number(s.principalAmount)) && s.principalAmount != null ? Number(s.principalAmount) : null,
    outstanding_balance: Number.isFinite(Number(s.outstandingBalance)) && s.outstandingBalance != null ? Number(s.outstandingBalance) : null,
    interest_rate: Number.isFinite(Number(s.interestRate)) && s.interestRate != null ? Number(s.interestRate) : null,
    term_months: Number.isFinite(Number(s.termMonths)) && s.termMonths != null ? Number(s.termMonths) : null,
    payment_scheme: s.paymentScheme ?? null,
    property_name: s.propertyName ?? null,
```

- [ ] **Step 2: Settings — pull/push `enabled_sections`.** В `pullSettings` добавить в возвращаемый объект: `enabledSections: data.enabled_sections ?? undefined,`. В `pushSettings` добавить в upsert: `enabled_sections: settings.enabledSections ?? null,`. В `syncSettings` ветке «remote wins» сохранить локальное, если remote пуст: заменить возврат на `return { ...remote, enabledSections: remote.enabledSections ?? localSettings.enabledSections, monthlyBudget: localSettings.monthlyBudget, budgetCurrency: localSettings.budgetCurrency };`.

- [ ] **Step 3: Проверить компиляцию.** Run: `npx tsc --noEmit`. Expected: чисто.

- [ ] **Step 4: Commit.**
```bash
git add src/lib/sync.ts
git commit -m "feat: persist loan columns + enabled_sections on sync"
```

---

### Task 5: SQL-миграция (раздел БД)

**Files:**
- Create: `supabase/2026-06-21-add-obligation-columns.sql`

- [ ] **Step 1: Создать файл** (аддитивно, NULL-safe, без изменения RLS — паттерн `2026-06-14-add-rates-column.sql`):
```sql
-- Credits & Mortgages: extend the subscriptions table with an obligation kind
-- discriminator and loan-specific fields. All additive + nullable — existing
-- subscription rows default to kind='subscription'. RLS unchanged (user_id = auth.uid()).
alter table public.subscriptions
  add column if not exists kind text not null default 'subscription',
  add column if not exists cycle_anchor text,
  add column if not exists lender text,
  add column if not exists loan_type text,
  add column if not exists principal_amount numeric,
  add column if not exists outstanding_balance numeric,
  add column if not exists interest_rate numeric,
  add column if not exists term_months integer,
  add column if not exists payment_scheme text,
  add column if not exists property_name text;

-- Which optional sections the user has enabled (credits / mortgages).
alter table public.user_settings
  add column if not exists enabled_sections jsonb;
```

- [ ] **Step 2: Применить миграцию в Supabase** (SQL editor / CLI) — выполняет владелец. Verify: `select column_name from information_schema.columns where table_name='subscriptions' and column_name='kind';` возвращает строку.

- [ ] **Step 3: Commit.**
```bash
git add supabase/2026-06-21-add-obligation-columns.sql
git commit -m "feat: SQL migration for obligation kind + loan columns"
```

---

### Task 6: Дефолт настроек + хелперы обязательств

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/lib/obligations.ts`

- [ ] **Step 1:** В `src/lib/constants.ts` в `DEFAULT_SETTINGS` добавить: `enabledSections: { credits: false, mortgages: false },`.

- [ ] **Step 2:** Создать `src/lib/obligations.ts`:
```ts
import type { Subscription, ObligationKind } from './types';

export type AppMode = 'subscriptions' | 'credits' | 'mortgages';

export function getKind(o: Subscription): ObligationKind {
  return o.kind ?? 'subscription';
}
export function isLoan(o: Subscription): boolean {
  const k = getKind(o);
  return k === 'credit' || k === 'mortgage';
}
export function matchesMode(o: Subscription, mode: AppMode): boolean {
  if (mode === 'subscriptions') return getKind(o) === 'subscription';
  if (mode === 'credits') return getKind(o) === 'credit';
  return getKind(o) === 'mortgage';
}
/** Список видимых режимов по настройкам (subscriptions всегда первый). */
export function visibleModes(enabled?: { credits: boolean; mortgages: boolean }): AppMode[] {
  const modes: AppMode[] = ['subscriptions'];
  if (enabled?.credits) modes.push('credits');
  if (enabled?.mortgages) modes.push('mortgages');
  return modes;
}
export const MODE_KIND: Record<AppMode, ObligationKind> = {
  subscriptions: 'subscription', credits: 'credit', mortgages: 'mortgage',
};
```

- [ ] **Step 3:** Run: `npx tsc --noEmit`. Expected: чисто.

- [ ] **Step 4: Commit.**
```bash
git add src/lib/constants.ts src/lib/obligations.ts
git commit -m "feat: default enabledSections + obligation/mode helpers"
```

**✅ Контрольная точка фазы 1:** `node src/lib/loanUtils.test.mjs` зелёный, `npx tsc --noEmit` чисто, `npm run build` проходит. Подписки работают как раньше (kind отсутствует ⇒ 'subscription').

---

## Phase 2 — Настройка разделов + переключатель режимов

### Task 7: Компонент `ModeSwitch` (пилюли)

**Files:**
- Create: `src/components/layout/ModeSwitch.tsx`

- [ ] **Step 1: Создать компонент.** Использует токены (работает в светлой/тёмных темах), Framer Motion `whileTap`, локализацию через `useLanguage`. Показывается только если режимов ≥2.
```tsx
'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { AppMode } from '@/lib/obligations';

const ICON: Record<AppMode, string> = { subscriptions: '🔁', credits: '💳', mortgages: '🏦' };
const LABEL_KEY: Record<AppMode, string> = {
  subscriptions: 'mode.subscriptions', credits: 'mode.credits', mortgages: 'mode.mortgages',
};

interface ModeSwitchProps {
  modes: AppMode[];
  active: AppMode;
  onChange: (m: AppMode) => void;
}

export function ModeSwitch({ modes, active, onChange }: ModeSwitchProps) {
  const { t } = useLanguage();
  if (modes.length < 2) return null;
  return (
    <div className="flex gap-2 px-5 pt-1 pb-1 overflow-x-auto no-scrollbar">
      {modes.map((m) => {
        const isActive = m === active;
        return (
          <motion.button
            key={m}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => { haptic.tap(); onChange(m); }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors',
              isActive
                ? 'bg-neon text-surface shadow-neon'
                : 'bg-surface-2 border border-border-subtle text-text-secondary',
            )}
          >
            <span className="text-sm">{ICON[m]}</span>
            {t(LABEL_KEY[m])}
          </motion.button>
        );
      })}
    </div>
  );
}
```
> Примечание: `no-scrollbar` — если такого utility нет, добавить инлайн `style` или класс в globals.css (`.no-scrollbar::-webkit-scrollbar{display:none}`); проверить наличие `grep no-scrollbar src/app/globals.css`.

- [ ] **Step 2:** Run: `npx tsc --noEmit`. Expected: чисто (ключи переводов добавим в Task 16; `t()` вернёт ключ-строку до этого — не ломает сборку).

- [ ] **Step 3: Commit.**
```bash
git add src/components/layout/ModeSwitch.tsx
git commit -m "feat: ModeSwitch pills component"
```

---

### Task 8: Блок «Разделы» в настройках

**Files:**
- Create: `src/components/settings/SectionsSettings.tsx`
- Modify: `src/components/settings/SettingsPage.tsx`

- [ ] **Step 1: Прочитать** `src/components/settings/SettingsPage.tsx`, чтобы понять структуру секций (карточки/тумблеры) и куда вставить блок. Скопировать визуальный паттерн существующего тумблера (toggle) для консистентности.

- [ ] **Step 2: Создать `SectionsSettings.tsx`** — карточка с двумя тумблерами (Кредиты, Ипотека). Props: `enabled`, `onChange(next)`. Стиль — как соседние секции настроек (токены, `useLanguage`). Тумблер можно переиспользовать из существующего компонента настроек (если есть `Toggle`/`Switch` — найти `grep -rl "role=\"switch\"\|Toggle" src/components/settings`), иначе сверстать локально как в макете.
```tsx
'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface Props {
  enabled: { credits: boolean; mortgages: boolean };
  onChange: (next: { credits: boolean; mortgages: boolean }) => void;
}
export function SectionsSettings({ enabled, onChange }: Props) {
  const { t } = useLanguage();
  const Row = ({ k, icon, title, desc }: { k: 'credits' | 'mortgages'; icon: string; title: string; desc: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-border-subtle first:border-t-0">
      <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center text-lg">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-[11px] text-text-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled[k]}
        onClick={() => onChange({ ...enabled, [k]: !enabled[k] })}
        className={`relative w-[46px] h-[27px] rounded-full transition-colors ${enabled[k] ? 'bg-neon' : 'bg-surface-4'}`}
      >
        <span className={`absolute top-[3px] left-[3px] w-[21px] h-[21px] rounded-full bg-white transition-transform ${enabled[k] ? 'translate-x-[19px]' : ''}`} />
      </button>
    </div>
  );
  return (
    <div className="rounded-2xl bg-surface-2 border border-border-subtle overflow-hidden">
      <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">{t('settings.sections.title')}</p>
      <p className="px-4 pb-2 text-[11px] text-text-secondary leading-snug">{t('settings.sections.desc')}</p>
      <Row k="credits" icon="💳" title={t('mode.credits')} desc={t('settings.sections.creditsDesc')} />
      <Row k="mortgages" icon="🏦" title={t('mode.mortgages')} desc={t('settings.sections.mortgagesDesc')} />
    </div>
  );
}
```

- [ ] **Step 3: Вставить в `SettingsPage.tsx`** рядом с другими секциями (вверху списка, после заголовка). Прокинуть `enabledSections` и колбэк через существующие props `settings`/`updateSettings` (они уже передаются в `SettingsPage` из `page.tsx`):
```tsx
<SectionsSettings
  enabled={settings.enabledSections ?? { credits: false, mortgages: false }}
  onChange={(next) => updateSettings({ enabledSections: next })}
/>
```

- [ ] **Step 4:** Run: `npm run build`. Expected: проходит.

- [ ] **Step 5:** Ручная проверка на :3000 — в Настройках появились тумблеры; включение сохраняется (перезагрузка страницы сохраняет состояние из localStorage).

- [ ] **Step 6: Commit.**
```bash
git add src/components/settings/SectionsSettings.tsx src/components/settings/SettingsPage.tsx
git commit -m "feat: Sections settings (credits/mortgages toggles)"
```

---

### Task 9: `appMode` + фильтрация + ModeSwitch в page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Состояние и режимы.** В `Home()` добавить рядом с `activeTab`:
```tsx
import { ModeSwitch } from '@/components/layout/ModeSwitch';
import { matchesMode, visibleModes, MODE_KIND, type AppMode } from '@/lib/obligations';
// ...
const [appMode, setAppMode] = useState<AppMode>('subscriptions');
const modes = useMemo(() => visibleModes(settings.enabledSections), [settings.enabledSections]);
// схлопнуть режим, если раздел выключили
useEffect(() => { if (!modes.includes(appMode)) setAppMode('subscriptions'); }, [modes, appMode]);
```

- [ ] **Step 2: Фильтрованный список по режиму.** Добавить:
```tsx
const modeSubscriptions = useMemo(
  () => activeSubscriptions.filter((s) => matchesMode(s, appMode)),
  [activeSubscriptions, appMode],
);
```

- [ ] **Step 3: Рендер ModeSwitch** над контентом home/analytics/calendar (внутри `motion.div` с `key={activeTab}`, перед блоками вкладок), но НЕ на settings:
```tsx
{activeTab !== 'settings' && (
  <ModeSwitch modes={modes} active={appMode} onChange={setAppMode} />
)}
```

- [ ] **Step 4: Передавать `modeSubscriptions` вместо `activeSubscriptions`** в `HomeTab`/`AnalyticsPage`/`CalendarPage` ТОЛЬКО когда `appMode==='subscriptions'` оставляем существующий путь; когда режим — кредит/ипотека, рендерим `LoanList` (Task 12) вместо `HomeTab`. На этой задаче пока: если `appMode!=='subscriptions'`, показать заглушку `<div className="px-5 pt-4 text-text-muted text-sm">{t('mode.comingSoon')}</div>` (заменим в фазе 3).

- [ ] **Step 5: FAB-режим.** `openAdd` оставить, но прокинуть текущий `appMode` в форму (фаза 3). Пока — без изменений.

- [ ] **Step 6:** Run: `npm run build`. Expected: проходит.

- [ ] **Step 7:** Ручная проверка: включи «Кредиты» в настройках → появились пилюли (Подписки | Кредиты), переключение работает, на Кредитах — заглушка.

- [ ] **Step 8: Commit.**
```bash
git add src/app/page.tsx
git commit -m "feat: appMode state + ModeSwitch wiring + mode filtering"
```

**✅ Контрольная точка фазы 2:** дефолт — только Подписки без пилюль; включение раздела добавляет пилюлю; переключение режима меняет контент (пока заглушка для кредитов).

---

## Phase 3 — Кредиты (карточка, форма, деталь + график)

### Task 10: `LoanCard`

**Files:**
- Create: `src/components/loan/LoanCard.tsx`

- [ ] **Step 1: Прочитать** `src/components/subscription/SubCard.tsx` для визуального паттерна (иконка-тайл, бейдж статуса, swipe-to-delete опц.).

- [ ] **Step 2: Создать `LoanCard.tsx`** — заголовок = остаток долга, платёж + дата, прогресс-бар (см. макет). Использовать `loanProgressPct`, `CURRENCY_SYMBOLS`, токены. Монограмма банка = первая буква `lender` на фоне `color`. Props: `obligation`, `index`, `onTap`. Реализовать карточку как в `mockups/credits-concept/index.html` (класс `.loancard`): верхняя строка (иконка+название+бейдж+тип), строка «Остаток долга / Платёж·дата», прогресс. Статус-бейдж — по `getDaysUntilPayment(nextPaymentDate)` (как `getPaymentStatus` в SubCard, упрощённо: overdue/скоро/активен).

- [ ] **Step 3:** Run: `npx tsc --noEmit`. Expected: чисто.

- [ ] **Step 4: Commit.**
```bash
git add src/components/loan/LoanCard.tsx
git commit -m "feat: LoanCard component"
```

### Task 11: `LoanList` + пустое состояние

**Files:**
- Create: `src/components/loan/LoanList.tsx`

- [ ] **Step 1: Создать** — список `LoanCard` + итоговая «шапка» (totalcard: «платёж в месяц» = Σ price, «общий долг» = Σ outstandingBalance) + пустое состояние с CTA «Добавить кредит/ипотеку» (текст по `kind`). Props: `obligations`, `mode`, `currency`, `onTap`, `onAdd`.

- [ ] **Step 2:** Run: `npx tsc --noEmit`. Expected: чисто.

- [ ] **Step 3: Commit.**
```bash
git add src/components/loan/LoanList.tsx
git commit -m "feat: LoanList with totals + empty state"
```

### Task 12: Подключить `LoanList` в page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1:** Заменить заглушку из Task 9 Step 4: при `appMode==='credits' || appMode==='mortgages'` рендерить:
```tsx
<LoanList
  obligations={modeSubscriptions}
  mode={appMode}
  currency={settings.displayCurrency}
  onTap={openDetail}
  onAdd={openAdd}
/>
```
(`modeSubscriptions` уже отфильтрован по режиму.)

- [ ] **Step 2:** Run: `npm run build`. Ручная проверка: на Кредитах — пустое состояние + кнопка.

- [ ] **Step 3: Commit.**
```bash
git add src/app/page.tsx
git commit -m "feat: render LoanList in credit/mortgage modes"
```

### Task 13: `LoanForm` (добавление/редактирование)

**Files:**
- Create: `src/components/loan/LoanForm.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Прочитать** `src/components/subscription/SubForm.tsx` — взять паттерн пикера валюты, кнопок, submit, и сигнатуру `onSubmit(data: Omit<Subscription,'id'|'createdAt'|'updatedAt'>)`.

- [ ] **Step 2: Создать `LoanForm.tsx`.** Поля: `name`, `lender`, `loanType` (для credit: consumer/auto/installment/debt; для mortgage фиксируем 'mortgage'), `propertyName` (только mortgage), `currency`, `outstandingBalance` (обяз.), `price` = ежемесячный платёж (обяз.), `nextPaymentDate` (обяз.), `interestRate` (опц.), `principalAmount` (опц., дефолт = outstandingBalance если пусто), `termMonths` (опц.), `paymentScheme` (annuity/differentiated, дефолт annuity), `notes`, `color`, `icon`. На submit собрать объект с `kind` = `MODE_KIND[mode]`, `cycle: 'monthly'`, `cycleAnchor: 'date'`, `category: ''`, `isActive: true`, `paymentMethod: ''`, `managementUrl: ''`. Минимум 3 обязательных (остаток, платёж, дата) — валидация перед submit.
> Реюз пикеров: валюта — как в SubForm; дата — нативный `<input type="date">` (как в проекте). Кнопка submit/стиль — токены.

- [ ] **Step 3: Подключить в page.tsx.** В Add-модалке: если `appMode!=='subscriptions'`, рендерить `LoanForm mode={appMode}` вместо `SubForm`; `onSubmit` → `wsAddSubscription(data)`. Аналогично Edit-модалка: если `isLoan(editingSub)`, рендерить `LoanForm mode={getKind(editingSub)==='mortgage'?'mortgages':'credits'} initialData={editingSub}`. Заголовок модалки — `t('modal.newCredit')`/`t('modal.newMortgage')`.

- [ ] **Step 4:** Run: `npm run build`. Ручная проверка: FAB в режиме «Кредиты» открывает форму кредита; добавление создаёт карточку с остатком/платежом/прогрессом; перезагрузка сохраняет.

- [ ] **Step 5: Commit.**
```bash
git add src/components/loan/LoanForm.tsx src/app/page.tsx
git commit -m "feat: LoanForm add/edit wired into add & edit modals"
```

### Task 14: `AmortizationTable` + `LoanDetail`

**Files:**
- Create: `src/components/loan/AmortizationTable.tsx`
- Create: `src/components/loan/LoanDetail.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: `AmortizationTable.tsx`** — принимает `rows: ScheduleRow[]`, рендерит таблицу (Месяц · Платёж · Тело · Проценты · Остаток) как в макете (`.amort`); прошлые строки — приглушены, ближайшая — подсвечена. На мобиле: по умолчанию свернуть в годовые группы с раскрытием в месяцы (MVP: показать первые 12 строк + кнопка «показать весь график»).

- [ ] **Step 2: `LoanDetail.tsx`** — донат `loanProgressPct(principalAmount ?? outstandingBalance? , outstandingBalance)`, статы (остаток/платёж/ставка/переплата/срок) из `summarizeLoan({ balance: outstandingBalance, annualRatePct: interestRate ?? 0, termMonths: termMonths ?? <вычислить>, scheme: paymentScheme ?? 'annuity', startDate: nextPaymentDate, monthlyPayment: price })`, затем `AmortizationTable rows={buildSchedule(...)}`, кнопка «Внести досрочный платёж» (фаза 4 — пока заглушка/disabled). Props как у `SubDetail`: `onClose`, `onEdit`, `onDelete`, `onToggleActive`.
> Если `termMonths` не задан — оценить из остатка и платежа: подобрать минимальное `n`, при котором `buildSchedule` гасит долг (или показать только ближайшие 24 платежа без «дата погашения»). Реализовать хелпер `estimateTermMonths(balance, payment, ratePct)` в `loanUtils.ts` (+тест) при необходимости.

- [ ] **Step 3: Подключить в page.tsx** — Detail-модалка: если `isLoan(detailSub)`, рендерить `LoanDetail` вместо `SubDetail`.

- [ ] **Step 4:** Run: `npm run build`. Ручная проверка: тап по карточке кредита открывает деталь с графиком; цифры сходятся.

- [ ] **Step 5: Commit.**
```bash
git add src/components/loan/AmortizationTable.tsx src/components/loan/LoanDetail.tsx src/app/page.tsx
git commit -m "feat: LoanDetail with amortization schedule"
```

**✅ Контрольная точка фазы 3:** можно включить «Кредиты», добавить кредит, увидеть карточку с остатком/прогрессом и деталь с графиком (аннуитет/дифференц.). Подписки не затронуты.

---

## Phase 4 — Ипотека + досрочный платёж

### Task 15: Режим «Ипотека» (переиспользование)

**Files:**
- Modify: `src/components/loan/LoanForm.tsx` (поле `propertyName`, `loanType='mortgage'`)
- Modify: `src/app/page.tsx` (заголовки/режим mortgage — уже покрыто Task 13 Step 3, проверить)

- [ ] **Step 1:** Убедиться, что `appMode==='mortgages'` даёт форму с полем «Объект недвижимости» и `kind='mortgage'`; карточка/деталь/график переиспользуются автоматически (бейдж «Ипотека»).
- [ ] **Step 2:** Run: `npm run build`. Ручная проверка: включить «Ипотека», добавить, увидеть бейдж и длинный график.
- [ ] **Step 3: Commit.**
```bash
git add -A && git commit -m "feat: mortgage mode (property field + reuse)"
```

### Task 16: Досрочный платёж (what-if)

**Files:**
- Modify: `src/lib/loanUtils.ts` (+тест), `src/components/loan/LoanDetail.tsx`

- [ ] **Step 1: Тест** на `applyExtraPayment(input, extra)` → возвращает `{ rowsBefore, rowsAfter, monthsSaved, interestSaved }`. Прогон графика дважды (с/без доп. вычета из тела). Добавить в `loanUtils.test.mjs`.
- [ ] **Step 2: Запустить — падает.** Run: `node src/lib/loanUtils.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Реализовать** `applyExtraPayment` в `loanUtils.ts` (уменьшить `balance` на `extra`, пересобрать график, сравнить длину и Σ процентов).
- [ ] **Step 4: Зелёные тесты.** Run: `node src/lib/loanUtils.test.mjs`. Expected: PASS.
- [ ] **Step 5:** Включить кнопку «Внести досрочный платёж» в `LoanDetail` — модалка ввода суммы → показать «срок −N мес, экономия M ₽». (UI-минимум; запись в историю — defer.)
- [ ] **Step 6:** Run: `npm run build`. Commit.
```bash
git add src/lib/loanUtils.ts src/lib/loanUtils.test.mjs src/components/loan/LoanDetail.tsx
git commit -m "feat: extra-payment what-if (months/interest saved)"
```

**✅ Контрольная точка фазы 4:** ипотека работает на тех же компонентах; досрочный платёж показывает экономию.

---

## Phase 5 — Полировка (аналитика/календарь, i18n, пустые состояния)

### Task 17: Mode-aware аналитика и календарь

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1:** Передавать в `AnalyticsPage`/`CalendarPage` `modeSubscriptions` (отфильтрованный по `appMode`) вместо `activeSubscriptions`, чтобы вкладки уважали пилюли. Для кредитов/ипотеки итоги считаются как `getMonthlyPrice` (= price), что уже работает. (Категорийные графики аналитики для кредитов оставить как есть — они просто получат пустые категории; при необходимости в будущем сгруппировать по `loanType` — defer.)
- [ ] **Step 2:** Run: `npm run build`. Ручная проверка: на вкладке Календарь в режиме «Кредиты» видны даты платежей кредитов.
- [ ] **Step 3: Commit.**
```bash
git add src/app/page.tsx
git commit -m "feat: mode-aware analytics & calendar"
```

### Task 18: Переводы RU/EN + финальная вычитка

**Files:**
- Modify: `src/lib/translations.ts`

- [ ] **Step 1: Прочитать** структуру `translations.ts` (как организованы ключи и языки). Добавить ключи (RU + EN): `mode.subscriptions`, `mode.credits`, `mode.mortgages`, `mode.comingSoon`, `settings.sections.title`, `settings.sections.desc`, `settings.sections.creditsDesc`, `settings.sections.mortgagesDesc`, `modal.newCredit`, `modal.newMortgage`, `loan.balance`, `loan.payment`, `loan.rate`, `loan.overpay`, `loan.payoff`, `loan.progress`, `loan.schedule`, `loan.extraPayment`, `loan.empty.credits`, `loan.empty.mortgages`, формы кредита (метки полей), типы кредита.
- [ ] **Step 2:** Run: `npm run build`. Ручная проверка RU и EN (переключение языка) — нет «голых» ключей.
- [ ] **Step 3: Commit.**
```bash
git add src/lib/translations.ts
git commit -m "feat: RU/EN strings for credits & mortgages"
```

**✅ Контрольная точка фазы 5 (релиз):** прогнать `node src/lib/loanUtils.test.mjs`, `node src/lib/syncMerge.test.mjs`, `npx tsc --noEmit`, `npm run build` — всё зелёное. Полный сценарий вручную: дефолт = только подписки → включить кредиты+ипотеку → добавить по записи каждого типа → карточки/деталь/график/календарь/напоминания работают → выключить разделы → пилюли исчезают, данные остаются. Затем — бамп версии `vX.Y.Z` в `src/lib/version.ts` + `CLAUDE.md`, коммит, по готовности `git push` (деплой на Vercel — отдельным решением пользователя).

---

## Заметки по рискам

- **`enabled_sections`/`kind` в БД:** миграцию (Task 5) применить ДО первого синка пользователя с новой сборкой, иначе `pushSettings`/`subscriptionToDb` запишут несуществующие колонки и upsert упадёт (есть per-row retry, но лучше не рисковать). Порядок: применить SQL → задеплоить код.
- **Переиспользование `price` как платежа:** задокументировано выше; если в будущем понадобится отдельный `monthlyPayment` — добавить поле, но v1 сознательно реюзит `price`.
- **`category` у кредитов пустая** — аналитика по категориям для кредитов не строится (ожидаемо). Не показывать категорийный пирог в режимах кредит/ипотека.
- **Live-курс для многолетней ипотеки** — суммы в чужой валюте конвертируются по сегодняшнему курсу (как у подписок). Поведение задокументировано в спеке.
