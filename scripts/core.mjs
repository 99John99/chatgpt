export const ORIGIN = 'https://gaio.movate.com';

export function validate(config, action, confirmed) {
  if (new URL(config.url).origin !== ORIGIN) throw new Error('INVALID_ORIGIN');
  if (!['inspect', 'check-in', 'check-out'].includes(action)) throw new Error('INVALID_ACTION');
  if (!config.authenticatedSelector) throw new Error('CONFIG_REQUIRED');
  if (action !== 'inspect') {
    if (confirmed !== 'true') throw new Error('CONFIRMATION_REQUIRED');
    if (!config.enabled) throw new Error('AUTOMATION_DISABLED');
    if (!config.actions[action]?.buttonSelector || !config.alertSelector || !config.alertOkSelector ||
        !config.emailSelector || !config.passwordSelector) throw new Error('CONFIG_REQUIRED');
  }
}

export function alertCode(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.includes('You have already checked IN for today!')) return 'ALREADY_CHECKED_IN';
  // Unobserved messages are acknowledged without calling them successful attendance.
  return 'ALERT_ACKNOWLEDGED';
}

export async function execute(page, config, action, confirmed, credentials = {}, navigate) {
  validate(config, action, confirmed);
  if (action !== 'inspect' && (!credentials.email || !credentials.password)) throw new Error('CREDENTIALS_REQUIRED');
  if (navigate) await navigate(page, config.url, credentials);
  else await page.goto(config.url, { waitUntil: 'domcontentloaded' });
  await page.locator(config.authenticatedSelector).waitFor({ state: 'visible', timeout: 30000 });
  if (new URL(page.url()).origin !== ORIGIN) throw new Error('LOGIN_REQUIRED');
  if (action === 'inspect') return 'ACCESS_CONFIRMED';
  const alert = page.locator(config.alertSelector);
  if (await alert.isVisible()) throw new Error('EXISTING_ALERT');
  const button = page.locator(config.actions[action].buttonSelector);
  if (await button.count() !== 1 || !await button.isVisible() || !await button.isEnabled()) throw new Error('BUTTON_UNAVAILABLE');
  await page.locator(config.emailSelector).fill(credentials.email);
  await page.locator(config.passwordSelector).fill(credentials.password);
  if (new URL(page.url()).origin !== ORIGIN) throw new Error('LOGIN_REQUIRED');

  let resolveNative;
  const native = new Promise(resolve => { resolveNative = resolve; });
  const onDialog = async dialog => {
    try {
      if (dialog.type() !== 'alert') { await dialog.dismiss(); resolveNative({ code: 'UNEXPECTED_DIALOG' }); return; }
      const code = alertCode(dialog.message());
      await dialog.accept();
      resolveNative({ code });
    } catch { resolveNative({ code: 'UNCONFIRMED' }); }
  };
  page.on('dialog', onDialog);
  try {
    // One click only; never retry an uncertain attendance request.
    await button.click({ timeout: 15000 });
    const response = await Promise.race([
      native,
      alert.waitFor({ state: 'visible', timeout: 30000 }).then(() => ({ dom: true }))
    ]);
    if (response.dom) {
      const code = alertCode(await alert.innerText());
      const ok = alert.locator(config.alertOkSelector);
      await ok.click({ timeout: 15000 });
      await alert.waitFor({ state: 'hidden', timeout: 15000 });
      return code;
    }
    if (['UNEXPECTED_DIALOG', 'UNCONFIRMED'].includes(response.code)) throw new Error(response.code);
    return response.code;
  } finally {
    page.off('dialog', onDialog);
  }
}
