import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(fileURLToPath(import.meta.url));

const {
  getMonetizationConfig,
  getEffectiveProStatus,
  getNotifyCronMaxUsers,
  getNotifyCronTelegramBatchSize,
  shouldIncludeFreeUsersInTelegramCron,
} = jiti('./monetization.ts');

test('monetization is hidden and paid features are free by default', () => {
  const config = getMonetizationConfig({});

  assert.equal(config.monetizationEnabled, false);
  assert.equal(config.freeProAccess, true);
  assert.deepEqual(getEffectiveProStatus({ isPro: false, proUntil: null, now: new Date('2026-05-19T00:00:00Z'), env: {} }), {
    isPro: true,
    proUntil: null,
  });
});

test('monetization can be restored with an env flag', () => {
  const env = { NEXT_PUBLIC_MONETIZATION_ENABLED: 'true' };
  const config = getMonetizationConfig(env);

  assert.equal(config.monetizationEnabled, true);
  assert.equal(config.freeProAccess, false);
  assert.deepEqual(getEffectiveProStatus({ isPro: false, proUntil: null, now: new Date('2026-05-19T00:00:00Z'), env }), {
    isPro: false,
    proUntil: null,
  });
});

test('telegram cron includes free users by default but can be disabled', () => {
  assert.equal(shouldIncludeFreeUsersInTelegramCron({}), true);
  assert.equal(shouldIncludeFreeUsersInTelegramCron({ TELEGRAM_NOTIFICATIONS_FOR_FREE_USERS: 'true' }), true);
  assert.equal(shouldIncludeFreeUsersInTelegramCron({ TELEGRAM_NOTIFICATIONS_FOR_FREE_USERS: 'false' }), false);
});

test('telegram cron processes at most 500 users by default', () => {
  assert.equal(getNotifyCronMaxUsers({}), 500);
  assert.equal(getNotifyCronMaxUsers({ NOTIFY_CRON_MAX_USERS: '250' }), 250);
  assert.equal(getNotifyCronMaxUsers({ NOTIFY_CRON_MAX_USERS: '0' }), 500);
});

test('telegram cron sends users in safe batches by default', () => {
  assert.equal(getNotifyCronTelegramBatchSize({}), 20);
  assert.equal(getNotifyCronTelegramBatchSize({ NOTIFY_CRON_TELEGRAM_BATCH_SIZE: '10' }), 10);
  assert.equal(getNotifyCronTelegramBatchSize({ NOTIFY_CRON_TELEGRAM_BATCH_SIZE: '0' }), 20);
});
