import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(fileURLToPath(import.meta.url));
const { annuityPayment, buildSchedule, summarizeLoan, loanProgressPct, applyExtraPayment } = jiti('./loanUtils.ts');

const baseLoan = { balance: 100000, annualRatePct: 12, termMonths: 12, scheme: 'annuity', startDate: '2026-07-01' };

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

test('extra payment: no extra equals baseline', () => {
  const r = applyExtraPayment(baseLoan, { strategy: 'reduceTerm' });
  assert.equal(r.monthsSaved, 0);
  assert.equal(r.interestSaved, 0);
  assert.equal(r.next.remainingPayments, 12);
});

test('extra payment: recurring extra (reduce term) shortens loan and saves interest', () => {
  const r = applyExtraPayment(baseLoan, { strategy: 'reduceTerm', extraMonthly: 3000 });
  assert.ok(r.next.remainingPayments < 12, 'fewer payments');
  assert.ok(r.monthsSaved > 0, 'months saved');
  assert.ok(r.interestSaved > 0, 'interest saved');
});

test('extra payment: lump sum (reduce term) shortens loan', () => {
  const r = applyExtraPayment(baseLoan, { strategy: 'reduceTerm', lumpSum: 30000 });
  assert.ok(r.next.remainingPayments < 12);
  assert.ok(r.monthsSaved > 0);
  assert.ok(r.interestSaved > 0);
});

test('extra payment: lump sum (reduce payment) lowers monthly, keeps term', () => {
  const base = summarizeLoan(baseLoan);
  const r = applyExtraPayment(baseLoan, { strategy: 'reducePayment', lumpSum: 30000 });
  assert.equal(r.next.remainingPayments, 12, 'same term');
  assert.equal(r.monthsSaved, 0);
  assert.ok(r.newMonthlyPayment < base.monthlyPayment, 'lower payment');
  assert.ok(r.interestSaved > 0, 'interest saved');
});

test('extra payment: huge extra pays off almost immediately', () => {
  const r = applyExtraPayment(baseLoan, { strategy: 'reduceTerm', lumpSum: 95000 });
  assert.ok(r.next.remainingPayments <= 2);
  assert.ok(r.schedule[r.schedule.length - 1].balance < 1);
});
