import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calendarDecision, scheduledAction } from '../scripts/calendar.mjs';
const config=JSON.parse(await readFile(new URL('../schedule.json',import.meta.url),'utf8'));
test('Both cron events map to the requested local actions',()=>{
  assert.equal(scheduledAction('0 8 * * 1-5'),'check-in');
  assert.equal(scheduledAction('0 17 * * 1-5'),'check-out');
  assert.throws(()=>scheduledAction('unknown'));
});
test('Monday 8 AM / 5 PM in Costa Rica are allowed',()=>{
  assert.equal(calendarDecision(config,'check-in',new Date('2026-10-05T14:00:00Z')).run,true);
  assert.equal(calendarDecision(config,'check-out',new Date('2026-10-05T23:00:00Z')).run,true);
});
test('Weekends and local dates near UTC midnight are handled correctly',()=>{
  assert.equal(calendarDecision(config,'check-in',new Date('2026-10-03T14:00:00Z')).run,false);
  assert.equal(calendarDecision(config,'check-out',new Date('2026-10-03T01:00:00Z')).date,'2026-10-02');
});
test('Individual holidays, inclusive vacation ranges and pause skip both actions',()=>{
  const now=new Date('2026-10-05T14:00:00Z');
  for(const action of ['check-in','check-out']) {
    assert.equal(calendarDecision({...config,excludedDates:['2026-10-05']},action,now).run,false);
    assert.equal(calendarDecision({...config,excludedRanges:[{from:'2026-10-05',to:'2026-10-09'}]},action,now).run,false);
    assert.equal(calendarDecision({...config,excludedRanges:[{from:'2026-10-01',to:'2026-10-05'}]},action,now).run,false);
    assert.equal(calendarDecision({...config,enabled:false},action,now).run,false);
  }
  assert.equal(calendarDecision({...config,excludedRanges:[{from:'2026-10-01',to:'2026-10-04'}]},'check-in',now).run,true);
});
test('Workflow cron and documented times stay aligned',async()=>{
 const yaml=await readFile(new URL('../.github/workflows/gaio.yml',import.meta.url),'utf8');
 assert.ok(yaml.includes("cron: '0 8 * * 1-5'"));
 assert.ok(yaml.includes("cron: '0 17 * * 1-5'"));
 assert.equal((yaml.match(/timezone: America\/Costa_Rica/g)||[]).length,2);
 assert.equal(config.times['check-in'],'08:00');assert.equal(config.times['check-out'],'17:00');
});
