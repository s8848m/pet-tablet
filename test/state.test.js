import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, applyTime, hearts, mood, clamp,
  MAX_CATCHUP_MS, DEFAULT_TASKS,
  feed, play, wash, sleepPet, wake, petTouch, shouldAutoSleep,
  openApp, neglectDays,
} from '../js/state.js';

const H = 3600 * 1000;
const T0 = new Date(2026, 9, 7, 12, 0, 0).getTime(); // 2026-10-07 12:00 local
const base = () => createInitialState({ kind: 'mochi', name: '테스트', pin: '1234' }, T0);

test('initial state: all stats 100, baby, 5 default tasks, today key', () => {
  const s = base();
  assert.deepEqual(s.stats, { hunger: 100, fun: 100, clean: 100, energy: 100 });
  assert.equal(s.growth.stage, 'baby');
  assert.equal(s.tasks.length, 5);
  assert.equal(s.tasks[0].name, DEFAULT_TASKS[0].name);
  assert.equal(s.today.key, '2026-10-07');
  assert.equal(s.settings.pin, '1234');
  assert.equal(s.asleep, false);
});

test('applyTime: 12h → hunger 0, fun 0, clean 50, energy 25', () => {
  const s = applyTime(base(), T0 + 12 * H);
  assert.equal(s.stats.hunger, 0);
  assert.equal(s.stats.fun, 0);
  assert.equal(s.stats.clean, 50);
  assert.equal(s.stats.energy, 25);
  assert.equal(s.statsAt, T0 + 12 * H);
});

test('applyTime: 6h → hunger 50', () => {
  assert.equal(applyTime(base(), T0 + 6 * H).stats.hunger, 50);
});

test('applyTime: catch-up capped at 48h (7 days away == 48h)', () => {
  const a = applyTime(base(), T0 + 48 * H);
  const b = applyTime(base(), T0 + 7 * 24 * H);
  assert.deepEqual(a.stats, b.stats);
  assert.equal(MAX_CATCHUP_MS, 48 * H);
});

test('applyTime: clock going backwards changes nothing', () => {
  const s = applyTime(base(), T0 - 5 * H);
  assert.deepEqual(s.stats, base().stats);
});

test('applyTime while asleep: others decay at half speed, energy fills in 2h, auto-wake', () => {
  const s0 = { ...base(), asleep: true, stats: { hunger: 100, fun: 100, clean: 100, energy: 0 } };
  const s1 = applyTime(s0, T0 + 1 * H);
  assert.equal(s1.stats.energy, 50);
  assert.equal(s1.asleep, true);
  assert.ok(Math.abs(s1.stats.hunger - (100 - 100 / 12 / 2)) < 1e-9);
  const s2 = applyTime(s0, T0 + 2 * H);
  assert.equal(s2.stats.energy, 100);
  assert.equal(s2.asleep, false);
});

test('applyTime asleep for 3 days: no negatives/NaN, awake with energy 100', () => {
  const s0 = { ...base(), asleep: true, stats: { hunger: 10, fun: 10, clean: 10, energy: 0 } };
  const s = applyTime(s0, T0 + 72 * H);
  for (const v of Object.values(s.stats)) { assert.ok(v >= 0 && v <= 100 && !Number.isNaN(v)); }
  assert.equal(s.stats.energy, 100);
  assert.equal(s.asleep, false);
});

test('hearts thresholds', () => {
  assert.equal(hearts(100), 5); assert.equal(hearts(80), 5); assert.equal(hearts(79), 4);
  assert.equal(hearts(60), 4); assert.equal(hearts(40), 3); assert.equal(hearts(20), 2);
  assert.equal(hearts(1), 1); assert.equal(hearts(0), 0);
});

test('mood by average; asleep overrides', () => {
  const m = (h, f, c, e, asleep = false) => mood({ ...base(), asleep, stats: { hunger: h, fun: f, clean: c, energy: e } });
  assert.equal(m(100, 100, 100, 100), 'happy');
  assert.equal(m(80, 80, 80, 80), 'happy');
  assert.equal(m(55, 55, 55, 55), 'normal');
  assert.equal(m(35, 35, 35, 35), 'gloomy');
  assert.equal(m(10, 10, 10, 10), 'sad');
  assert.equal(m(100, 100, 100, 100, true), 'asleep');
});

test('clamp', () => { assert.equal(clamp(-3), 0); assert.equal(clamp(120), 100); assert.equal(clamp(42), 42); });

const withStats = (st, extra = {}) => ({ ...base(), ...extra, stats: { ...base().stats, ...st } });

test('feed: +40 capped at 100, refused at >=85, asleep result', () => {
  const r = feed(withStats({ hunger: 30 }), T0);
  assert.equal(r.result, 'ate'); assert.equal(r.state.stats.hunger, 70);
  assert.equal(feed(withStats({ hunger: 85 }), T0).result, 'refused');
  assert.equal(feed(withStats({ hunger: 84 }), T0).state.stats.hunger, 100);
  assert.equal(feed(withStats({ hunger: 10 }, { asleep: true }), T0).result, 'asleep');
});

test('feed applies elapsed time first', () => {
  const r = feed(withStats({ hunger: 100 }), T0 + 6 * H); // 50 after 6h → 90
  assert.equal(r.result, 'ate'); assert.equal(r.state.stats.hunger, 90);
});

test('play: +35', () => {
  const r = play(withStats({ fun: 10 }), T0);
  assert.equal(r.result, 'played'); assert.equal(r.state.stats.fun, 45);
});

test('wash: +60, already_clean at >=90', () => {
  assert.equal(wash(withStats({ clean: 20 }), T0).state.stats.clean, 80);
  assert.equal(wash(withStats({ clean: 90 }), T0).result, 'already_clean');
});

test('sleepPet / wake', () => {
  const r = sleepPet(withStats({ energy: 20 }), T0);
  assert.equal(r.result, 'slept'); assert.equal(r.state.asleep, true);
  assert.equal(sleepPet(withStats({ energy: 95 }), T0).result, 'not_sleepy');
  assert.equal(sleepPet(r.state, T0).result, 'already');
  const w = wake(r.state, T0 + 30 * 60 * 1000);
  assert.equal(w.result, 'woke'); assert.equal(w.state.asleep, false);
  assert.equal(w.state.stats.energy, 45); // 20 + 25 (30분)
  assert.equal(wake(w.state, T0).result, 'already_awake');
});

test('petTouch: +3 fun once per minute', () => {
  const a = petTouch(withStats({ fun: 50 }), T0);
  assert.equal(a.bonus, true); assert.equal(a.state.stats.fun, 53);
  const b = petTouch(a.state, T0 + 30 * 1000);
  assert.equal(b.bonus, false); assert.ok(b.state.stats.fun < 53 && b.state.stats.fun > 52.9); // decay ~0.083
  const c = petTouch(b.state, T0 + 61 * 1000);
  assert.equal(c.bonus, true);
});

test('care lowers gloom and sets lastCareAt', () => {
  const s = { ...withStats({ hunger: 10 }), gloom: 3 };
  const r = feed(s, T0 + 1000);
  assert.equal(r.state.gloom, 2); assert.equal(r.state.lastCareAt, T0 + 1000);
  assert.equal(feed(withStats({ hunger: 90 }, { gloom: 2 }), T0).state.gloom, 2); // 거절은 돌봄 아님
});

test('shouldAutoSleep: 22:00+ or before 04:00 with energy<30, awake only', () => {
  const at = (h) => new Date(2026, 9, 7, h, 10).getTime();
  assert.equal(shouldAutoSleep(withStats({ energy: 20 }), at(22)), true);
  assert.equal(shouldAutoSleep(withStats({ energy: 20 }), at(2)), true);
  assert.equal(shouldAutoSleep(withStats({ energy: 20 }), at(21)), false);
  assert.equal(shouldAutoSleep(withStats({ energy: 30 }), at(23)), false);
  assert.equal(shouldAutoSleep(withStats({ energy: 20 }, { asleep: true }), at(23)), false);
});

const D = 24 * H;

test('openApp after 3 days: gloom 3, returnedAfterDays 3, lastSeenAt updated, stats decayed(capped)', () => {
  const r = openApp(base(), T0 + 3 * D);
  assert.equal(r.returnedAfterDays, 3); assert.equal(r.state.gloom, 3);
  assert.equal(r.state.lastSeenAt, T0 + 3 * D);
  assert.equal(r.state.stats.hunger, 0);
  assert.equal(r.state.today.key, '2026-10-10');
});

test('openApp same day: gloom unchanged, returnedAfterDays 0', () => {
  const r = openApp({ ...base(), gloom: 1 }, T0 + H);
  assert.equal(r.returnedAfterDays, 0); assert.equal(r.state.gloom, 1);
});

test('neglectDays', () => {
  assert.equal(neglectDays(base(), T0 + 47 * H), 1);
  assert.equal(neglectDays(base(), T0 - H), 0);
});

test('three cares after neglect restore gloom to 0', () => {
  let s = openApp(base(), T0 + 3 * D).state;
  const now = T0 + 3 * D;
  s = feed(s, now).state; s = play(s, now).state; s = wash(s, now).state;
  assert.equal(s.gloom, 0);
});
