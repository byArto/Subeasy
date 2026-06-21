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
