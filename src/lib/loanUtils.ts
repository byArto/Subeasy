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
