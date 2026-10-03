import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, validate } from '../scripts/core.mjs';

const config = { url: 'https://gaio.movate.com/', enabled: true, authenticatedSelector: '#email',
  emailSelector: '#email', passwordSelector: '#password', alertSelector: '.alert', alertOkSelector: '#ok',
  actions: { 'check-in': { buttonSelector: '#in' }, 'check-out': { buttonSelector: '#out' } } };
const credentials = { email: 'test@example.com', password: 'fixture-only' };
function fake({ message = 'A result not seen before', native = false, timeout = false, existing = false } = {}) {
  const calls = { attendance: 0, ok: 0, fields: 0 };
  let shown = existing;
  const handlers = new Map();
  const page = { calls, goto: async () => {}, url: () => config.url,
    on: (name, fn) => handlers.set(name, fn), off: name => handlers.delete(name),
    locator: selector => ({
      count: async () => 1, isEnabled: async () => true,
      isVisible: async () => selector === '.alert' ? shown : true,
      fill: async () => { calls.fields++; },
      innerText: async () => message,
      locator: child => page.locator(child),
      click: async () => {
        if (selector === '#ok') { calls.ok++; shown = false; return; }
        calls.attendance++;
        if (native) await handlers.get('dialog')({ type: () => 'alert', message: () => message, accept: async () => { calls.ok++; } });
        else shown = true;
      },
      waitFor: async ({state}) => {
        if (selector !== '.alert') return;
        if (native && state === 'visible') return new Promise(() => {});
        if (timeout) throw new Error('Timeout');
        assert.equal(shown, state === 'visible');
      }
    })
  };
  return page;
}
test('Inspect does not enter attendance credentials or click', async () => {
  const p = fake();
  assert.equal(await execute(p,config,'inspect'), 'ACCESS_CONFIRMED');
  assert.deepEqual(p.calls,{attendance:0,ok:0,fields:0});
});
test('Reject unconfirmed, unknown, disabled or foreign-origin actions', () => {
  assert.throws(()=>validate(config,'check-in','false'));
  assert.throws(()=>validate(config,'unknown','true'));
  assert.throws(()=>validate({...config,enabled:false},'check-in','true'));
  assert.throws(()=>validate({...config,url:'https://example.com'},'inspect'));
});
test('Missing credentials never submits', async () => {
  const p=fake(); await assert.rejects(execute(p,config,'check-in','true'), /CREDENTIALS_REQUIRED/);
  assert.equal(p.calls.attendance,0);
});
test('Duplicate alert is acknowledged without retrying or claiming a new check-in', async () => {
  const p=fake({message:'You have already checked IN for today!\nNot valid!'});
  assert.equal(await execute(p,config,'check-in','true',credentials),'ALREADY_CHECKED_IN');
  assert.deepEqual(p.calls,{attendance:1,ok:1,fields:2});
});
test('Unknown checkout response is closed without claiming successful attendance', async () => {
  const p=fake(); assert.equal(await execute(p,config,'check-out','true',credentials),'ALERT_ACKNOWLEDGED');
  assert.equal(p.calls.ok,1); assert.equal(p.calls.attendance,1);
});
test('Native alert is acknowledged once', async () => {
  const p=fake({native:true}); assert.equal(await execute(p,config,'check-out','true',credentials),'ALERT_ACKNOWLEDGED');
  assert.equal(p.calls.ok,1); assert.equal(p.calls.attendance,1);
});
test('No alert / timeout does not cause a second attendance click', async () => {
  const p=fake({timeout:true}); await assert.rejects(execute(p,config,'check-in','true',credentials));
  assert.equal(p.calls.attendance,1);
});
test('An existing modal prevents a new attendance click', async () => {
  const p=fake({existing:true}); await assert.rejects(execute(p,config,'check-in','true',credentials),/EXISTING_ALERT/);
  assert.equal(p.calls.attendance,0);
});
