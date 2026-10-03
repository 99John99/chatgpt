import { ORIGIN } from './core.mjs';

const MICROSOFT = 'https://login.microsoftonline.com';
const ADFS = 'https://sso.csscorp.com';

// Handles only the two login pages observed during the live inspection.
// Any new MFA, consent, CAPTCHA or account-selection step stops this flow.
export async function openForm(page, url, credentials) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(u => [ORIGIN, MICROSOFT, ADFS].includes(u.origin), { timeout: 45000 });
  let origin = new URL(page.url()).origin;
  if (origin === ORIGIN) {
    // The application can still be in the middle of its initial redirect.
    await Promise.any([
      page.locator('#txtEmpID').waitFor({ state: 'visible', timeout: 45000 }),
      page.waitForURL(u => u.origin === MICROSOFT || u.origin === ADFS, { timeout: 45000 })
    ]);
    origin = new URL(page.url()).origin;
  }
  if (origin === MICROSOFT || origin === ADFS) {
    if (!credentials.email || !credentials.password) throw new Error('CREDENTIALS_REQUIRED');
  }
  if (origin === MICROSOFT) {
    await page.locator('input[name="loginfmt"]').waitFor({ state: 'visible', timeout: 15000 });
    if (new URL(page.url()).origin !== MICROSOFT) throw new Error('LOGIN_REQUIRED');
    await page.locator('input[name="loginfmt"]').fill(credentials.email);
    await page.locator('#idSIButton9').click();
    await page.waitForURL(u => u.origin === ADFS || u.origin === ORIGIN, { timeout: 45000 });
    origin = new URL(page.url()).origin;
  }
  if (origin === ADFS) {
    await page.locator('input[name="Password"]').waitFor({ state: 'visible', timeout: 15000 });
    if (new URL(page.url()).origin !== ADFS) throw new Error('LOGIN_REQUIRED');
    await page.locator('input[name="UserName"]').fill(credentials.email);
    await page.locator('input[name="Password"]').fill(credentials.password);
    await page.locator('#submitButton').click();
    await page.waitForURL(u => u.origin === ORIGIN, { timeout: 60000 });
  }
  if (new URL(page.url()).origin !== ORIGIN) throw new Error('LOGIN_REQUIRED');
  await page.locator('#txtEmpID').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#txtpassword').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#btncheckIn').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#btncheckOut').waitFor({ state: 'visible', timeout: 15000 });
}
