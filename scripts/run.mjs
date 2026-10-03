import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { execute, validate, ORIGIN } from './core.mjs';
import { openForm } from './access.mjs';
import { calendarDecision, scheduledAction } from './calendar.mjs';

let browser;
try {
  const scheduled = process.env.GITHUB_EVENT_NAME === 'schedule';
  const action = scheduled ? scheduledAction(process.env.GAIO_CRON) : (process.argv[2] || 'inspect');
  const calendar = JSON.parse(await readFile('schedule.json', 'utf8'));
  const decision = calendarDecision(calendar, action);
  if (!decision.run) { console.log(`SKIPPED: ${decision.reason}`); process.exit(0); }
  if (scheduled && Number(process.env.GITHUB_RUN_ATTEMPT || '1') > 1) { console.log('SKIPPED: SCHEDULED_RERUN'); process.exit(0); }
  const confirmed = scheduled ? 'true' : process.env.CONFIRM_ACTION;
  const config = JSON.parse(await readFile('gaio.config.json', 'utf8'));
  validate(config, action, confirmed);
  const encoded = process.env.GAIO_SESSION || (!process.env.CI && await readFile('.auth/session.txt', 'utf8').catch(() => ''));
  const bundle = encoded ? JSON.parse(gunzipSync(Buffer.from(encoded.trim(), 'base64'), { maxOutputLength: 5_000_000 }).toString()) : {};
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: bundle.storageState });
  await context.addInitScript(({ origin, state }) => {
    if (location.origin === origin) for (const [key, value] of Object.entries(state)) sessionStorage.setItem(key, value);
  }, { origin: ORIGIN, state: bundle.sessionStorage || {} });
  const page = await context.newPage();
  console.log(await execute(page, config, action, confirmed,
    { email: process.env.GAIO_EMAIL, password: process.env.GAIO_PASSWORD }, openForm));
} catch (error) {
  const codes = ['INVALID_ORIGIN', 'INVALID_ACTION', 'CONFIG_REQUIRED', 'CONFIRMATION_REQUIRED', 'AUTOMATION_DISABLED', 'EXISTING_ALERT', 'UNEXPECTED_DIALOG', 'UNKNOWN_SCHEDULE', 'LOGIN_REQUIRED', 'CREDENTIALS_REQUIRED', 'ALREADY_DONE_OR_AMBIGUOUS', 'BUTTON_UNAVAILABLE', 'UNCONFIRMED'];
  console.error(codes.includes(error.message) ? error.message : 'FAILED_OR_UNCONFIRMED');
  console.error('Revisa GAIO antes de repetir una marcación. No hay reintentos automáticos.');
  // Do not log browser errors, URLs, HTML, tokens, or screenshots to a public repository.
  process.exitCode = 1;
} finally {
  await browser?.close();
}
