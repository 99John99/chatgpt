import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, validate } from '../scripts/core.mjs';

const config = {
  url: 'https://gaio.movate.com/', verified: true, authenticatedSelector: '#authenticated',
  actions: { 'check-in': { buttonSelector: '#in', successSelector: '#done' } }
};
test('Blocks unconfirmed, unverified, unknown and foreign-origin actions', () => {
  assert.throws(() => validate(config, 'check-in', 'false'));
  assert.throws(() => validate({ ...config, verified: false }, 'check-in', 'true'));
  assert.throws(() => validate(config, 'anything', 'true'));
  assert.throws(() => validate({ ...config, url: 'https://example.com' }, 'inspect'));
});
function fakePage(alreadyDone = false, failsAfterClick = false) {
  let clicks = 0;
  return {
    clicks: () => clicks, goto: async () => {}, url: () => config.url,
    locator: selector => ({
      count: async () => 1, isEnabled: async () => true,
      isVisible: async () => selector === '#done' ? alreadyDone : true,
      click: async () => { clicks++; },
      waitFor: async () => { if (selector === '#done' && failsAfterClick) throw new Error('timeout'); }
    })
  };
}
test('Inspect never clicks', async () => {
  const page = fakePage();
  assert.equal(await execute(page, config, 'inspect'), 'ACCESS_CONFIRMED');
  assert.equal(page.clicks(), 0);
});
test('Already completed state prevents click', async () => {
  const page = fakePage(true);
  await assert.rejects(execute(page, config, 'check-in', 'true'));
  assert.equal(page.clicks(), 0);
});
test('Unconfirmed result is not retried', async () => {
  const page = fakePage(false, true);
  await assert.rejects(execute(page, config, 'check-in', 'true'));
  assert.equal(page.clicks(), 1);
});
test('Attendance form cannot be submitted without credentials', async () => {
  const page = fakePage();
  const form = { ...config, emailSelector: '#email', passwordSelector: '#password' };
  await assert.rejects(execute(page, form, 'check-in', 'true'), /CREDENTIALS_REQUIRED/);
  assert.equal(page.clicks(), 0);
});
test('Inspect with a credential form never fills or submits it', async () => {
  const page = fakePage();
  const form = { ...config, emailSelector: '#email', passwordSelector: '#password' };
  assert.equal(await execute(page, form, 'inspect'), 'ACCESS_CONFIRMED');
  assert.equal(page.clicks(), 0);
});
