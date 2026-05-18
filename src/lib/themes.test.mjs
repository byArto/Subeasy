import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(fileURLToPath(import.meta.url));

const {
  VALID_THEMES,
  THEME_OPTIONS,
  THEME_META,
  getThemeChrome,
} = jiti('./themes.ts');

test('claude theme is available to every user and has readable light chrome', () => {
  assert.ok(VALID_THEMES.includes('claude'));

  const option = THEME_OPTIONS.find((theme) => theme.value === 'claude');
  assert.equal(option?.proOnly, false);
  assert.equal(option?.label, 'Claude');

  assert.equal(THEME_META.claude.surface, '#faf9f5');
  assert.equal(THEME_META.claude.text, '#141413');
  assert.equal(THEME_META.claude.accent, '#d97757');
  assert.deepEqual(getThemeChrome('claude'), {
    themeColor: '#faf9f5',
    backgroundColor: '#faf9f5',
  });
});
