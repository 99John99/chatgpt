export function calendarDecision(config, action, now = new Date()) {
  if (action === 'inspect') return { run: true };
  if (!config.enabled) return { run: false, reason: 'PAUSED' };
  if (!['check-in', 'check-out'].includes(action)) throw new Error('INVALID_ACTION');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (!config.weekdays.includes(weekday)) return { run: false, reason: 'WEEKEND' };
  if (config.excludedDates.includes(date) || config.excludedRanges.some(r => date >= r.from && date <= r.to)) {
    return { run: false, reason: 'EXCLUDED_DATE' };
  }
  return { run: true, date };
}

export function scheduledAction(cron) {
  if (cron === '0 8 * * 1-5') return 'check-in';
  if (cron === '0 17 * * 1-5') return 'check-out';
  throw new Error('UNKNOWN_SCHEDULE');
}
