import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { gzipSync } from 'node:zlib';
import { ORIGIN } from './core.mjs';

const prompt = createInterface({ input: process.stdin, output: process.stdout });
let browser;
try {
  await mkdir('.auth', { recursive: true, mode: 0o700 });
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(ORIGIN);
  await prompt.question('Inicia sesión en el navegador, completa MFA y abre la sección de asistencia SIN marcar. Luego presiona Enter aquí. ');
  if (new URL(page.url()).origin !== ORIGIN) throw new Error('LOGIN_REQUIRED');
  const bundle = {
    storageState: await context.storageState({ indexedDB: true }),
    sessionStorage: await page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)))
  };
  const encoded = gzipSync(JSON.stringify(bundle)).toString('base64');
  if (Buffer.byteLength(encoded) >= 48000) throw new Error('SESSION_TOO_LARGE');
  await writeFile('.auth/session.txt', encoded, { mode: 0o600 });
  // Only local: this report may contain employee information. Never upload it to git.
  const controls = await page.locator('button, [role="button"], a').evaluateAll(elements =>
    elements.filter(e => e.getClientRects().length).map(e => ({
      tag: e.tagName, text: e.textContent?.trim(), ariaLabel: e.getAttribute('aria-label'), id: e.id
    })));
  await writeFile('.auth/controls.json', JSON.stringify({ url: page.url(), controls }, null, 2), { mode: 0o600 });
  console.log('Sesión guardada en .auth/session.txt. No compartas ese archivo ni su contenido en el chat.');
  console.log('Controles guardados localmente en .auth/controls.json. La sesión todavía debe probarse desde GitHub.');
} catch {
  console.error('No se pudo guardar la sesión. Revisa el login y las políticas de acceso; no se ha marcado asistencia.');
  process.exitCode = 1;
} finally {
  prompt.close();
  await browser?.close();
}
