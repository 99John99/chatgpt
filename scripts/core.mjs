export const ORIGIN = 'https://gaio.movate.com';

export function validate(config, action, confirmed) {
  if (new URL(config.url).origin !== ORIGIN) throw new Error('INVALID_ORIGIN');
  if (!['inspect', 'check-in', 'check-out'].includes(action)) throw new Error('INVALID_ACTION');
  if (!config.authenticatedSelector) throw new Error('CONFIG_REQUIRED');
  if (action !== 'inspect') {
    if (confirmed !== 'true') throw new Error('CONFIRMATION_REQUIRED');
    if (!config.verified) throw new Error('CONFIG_NOT_VERIFIED');
    const target = config.actions[action];
    if (!target?.buttonSelector || !target?.successSelector || target.buttonSelector === target.successSelector) {
      throw new Error('CONFIG_REQUIRED');
    }
  }
}

export async function execute(page, config, action, confirmed) {
  validate(config, action, confirmed);
  await page.goto(config.url, { waitUntil: 'domcontentloaded' });
  await page.locator(config.authenticatedSelector).waitFor({ state: 'visible', timeout: 30000 });
  if (new URL(page.url()).origin !== ORIGIN) throw new Error('LOGIN_REQUIRED');
  if (action === 'inspect') return 'ACCESS_CONFIRMED';
  const target = config.actions[action];
  const success = page.locator(target.successSelector);
  if (await success.isVisible()) throw new Error('ALREADY_DONE_OR_AMBIGUOUS');
  const button = page.locator(target.buttonSelector);
  if (await button.count() !== 1 || !await button.isVisible() || !await button.isEnabled()) {
    throw new Error('BUTTON_UNAVAILABLE');
  }
  // Exactly one attempt. A timeout can mean the server received the click.
  await button.click({ timeout: 15000 });
  await success.waitFor({ state: 'visible', timeout: 30000 });
  if (new URL(page.url()).origin !== ORIGIN) throw new Error('UNCONFIRMED');
  return 'ACTION_CONFIRMED';
}
