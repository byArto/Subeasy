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

/* ── Досрочное погашение ───────────────────────────────────────────────── */

export type ExtraStrategy = 'reduceTerm' | 'reducePayment';

export interface ExtraPaymentOptions {
  extraMonthly?: number;   // регулярная доплата каждый месяц
  lumpSum?: number;        // разовый платёж в начале (месяц 1)
  strategy: ExtraStrategy; // сократить срок ↔ снизить платёж
}

export interface ExtraPaymentResult {
  base: LoanSummary;          // график без доплат
  next: LoanSummary;          // график с доплатами
  schedule: ScheduleRow[];    // новый график
  interestSaved: number;      // сколько сэкономлено на процентах
  monthsSaved: number;        // на сколько месяцев раньше закрытие
  newMonthlyPayment: number;  // платёж первого месяца нового графика
}

/** График с доплатами в тело долга (сокращение срока). */
function buildScheduleWithExtra(input: LoanInput, extraMonthly: number, lumpSum: number): ScheduleRow[] {
  const { balance, annualRatePct, termMonths, scheme, startDate } = input;
  const r = annualRatePct / 100 / 12;
  const rows: ScheduleRow[] = [];
  let bal = balance;
  if (termMonths <= 0 || bal <= 0) return rows;

  const fixedPrincipal = round2(bal / termMonths);
  const annuity = input.monthlyPayment && input.monthlyPayment > 0
    ? input.monthlyPayment
    : annuityPayment(bal, annualRatePct, termMonths);

  // Срок не растягиваем — доплаты могут только укоротить его относительно termMonths.
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
    // Доплата в тело: регулярная + разовая в первом месяце, но не ниже нуля.
    const wantExtra = extraMonthly + (i === 1 ? lumpSum : 0);
    const extra = Math.max(0, Math.min(wantExtra, round2(bal - principal)));
    const totalPrincipal = round2(principal + extra);
    bal = round2(bal - totalPrincipal);
    rows.push({
      index: i,
      date: addMonths(startDate, i - 1),
      payment: round2(payment + extra),
      principal: totalPrincipal,
      interest,
      balance: Math.max(0, bal),
    });
  }
  return rows;
}

function scheduleToSummary(rows: ScheduleRow[]): LoanSummary {
  return {
    payoffDate: rows.length ? rows[rows.length - 1].date : null,
    totalInterest: round2(rows.reduce((s, row) => s + row.interest, 0)),
    remainingPayments: rows.length,
    monthlyPayment: rows.length ? rows[0].payment : 0,
  };
}

/** Сравнивает базовый график с графиком после досрочного погашения. */
export function applyExtraPayment(input: LoanInput, opts: ExtraPaymentOptions): ExtraPaymentResult {
  const base = summarizeLoan(input);
  const extraMonthly = Math.max(0, opts.extraMonthly ?? 0);
  const lumpSum = Math.max(0, opts.lumpSum ?? 0);

  let schedule: ScheduleRow[];
  if (opts.strategy === 'reducePayment') {
    // Снижаем платёж: гасим разовую сумму сейчас и пересчитываем аннуитет
    // на ИСХОДНЫЙ оставшийся срок → платёж меньше, дата закрытия та же.
    const reducedBalance = Math.max(0, round2(input.balance - lumpSum));
    schedule = buildSchedule({ ...input, balance: reducedBalance, monthlyPayment: undefined });
  } else {
    // Сокращаем срок: платёж прежний, доплаты идут в тело.
    schedule = buildScheduleWithExtra(input, extraMonthly, lumpSum);
  }

  const next = scheduleToSummary(schedule);
  return {
    base,
    next,
    schedule,
    interestSaved: round2(base.totalInterest - next.totalInterest),
    monthsSaved: base.remainingPayments - next.remainingPayments,
    newMonthlyPayment: next.monthlyPayment,
  };
}
