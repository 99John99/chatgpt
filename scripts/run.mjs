import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { execute, validate, ORIGIN } from './core.mjs';
import { openForm } from './access.mjs';

let browser;
try {
  const action = process.argv[2] || 'inspect';
  const config = JSON.parse(await readFile('gaio.config.json', 'utf8'));
  validate(config, action, process.env.CONFIRM_ACTION);
  const encoded = process.env.GAIO_SESSION || (!process.env.CI && await readFile('.auth/session.txt', 'utf8').catch(() => ''));
  const bundle = encoded ? JSON.parse(gunzipSync(Buffer.from(encoded.trim(), 'base64'), { maxOutputLength: 5_000_000 }).toString()) : {};
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: bundle.storageState });
  await context.addInitScript(({ origin, state }) => {
    if (location.origin === origin) for (const [key, value] of Object.entries(state)) sessionStorage.setItem(key, value);
  }, { origin: ORIGIN, state: bundle.sessionStorage || {} });
  const page = await context.newPage();
  // Unexpected dialogs must never be accepted automatically.
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
  console.log(await execute(page, config, action, process.env.CONFIRM_ACTION,
    { email: process.env.GAIO_EMAIL, password: process.env.GAIO_PASSWORD }, openForm));
} catch (error) {
  const codes = ['INVALID_ORIGIN', 'INVALID_ACTION', 'CONFIG_REQUIRED', 'CONFIRMATION_REQUIRED', 'CONFIG_NOT_VERIFIED', 'LOGIN_REQUIRED', 'CREDENTIALS_REQUIRED', 'ALREADY_DONE_OR_AMBIGUOUS', 'BUTTON_UNAVAILABLE', 'UNCONFIRMED'];
  console.error(codes.includes(error.message) ? error.message : 'FAILED_OR_UNCONFIRMED');
  console.error('Revisa GAIO antes de repetir una marcación. No hay reintentos automáticos.');
  // Do not log browser errors, URLs, HTML, tokens, or screenshots to a public repository.
  process.exitCode = 1;
} finally {
  await browser?.close();
}
