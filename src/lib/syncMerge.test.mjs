import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(fileURLToPath(import.meta.url));

const { mergePersonalSubscriptionsForSync } = jiti('./syncMerge.ts');

const sub = (id, extra = {}) => ({
  id,
  name: id,
  workspaceId: undefined,
  ...extra,
});

test('does not re-upload a local subscription that is known locally but missing remotely', () => {
  const result = mergePersonalSubscriptionsForSync({
    remoteSubs: [sub('remote-kept')],
    localSubs: [sub('remote-kept'), sub('deleted-on-another-device')],
    knownSyncedIds: ['remote-kept', 'deleted-on-another-device'],
    importLocalOnly: true,
  });

  assert.deepEqual(result.map((s) => s.id), ['remote-kept']);
});

test('imports genuinely new local-only subscriptions when local import is allowed', () => {
  const result = mergePersonalSubscriptionsForSync({
    remoteSubs: [sub('remote-kept')],
    localSubs: [sub('new-local')],
    knownSyncedIds: ['remote-kept'],
    importLocalOnly: true,
  });

  assert.deepEqual(result.map((s) => s.id), ['remote-kept', 'new-local']);
});

test('treats the server as authoritative when there is no known history and no import request', () => {
  const result = mergePersonalSubscriptionsForSync({
    remoteSubs: [],
    localSubs: [sub('stale-local')],
    knownSyncedIds: [],
    importLocalOnly: false,
  });

  assert.deepEqual(result, []);
});
