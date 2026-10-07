import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, applyTime, hearts, mood, clamp,
  MAX_CATCHUP_MS, DEFAULT_TASKS,
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
