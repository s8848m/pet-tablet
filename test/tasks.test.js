import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, dayKey, rollover, checkTask, uncheckTask, stage,
  setGoal, clearGoal, addTask, updateTask, removeTask, moveTask, isSlotActive,
} from '../js/state.js';

const H = 3600 * 1000, D = 24 * H;
const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const T0 = at(2026, 10, 7, 12);
const base = () => createInitialState({ kind: 'mochi', name: 'x', pin: '0000' }, T0);
const checkAll = (s, now) => {
  let events = [];
  for (const t of s.tasks) { const r = checkTask(s, t.id, now); s = r.state; events = events.concat(r.events); }
  return { state: s, events };
};

test('dayKey: 03:59 belongs to previous day, 04:00 is new day', () => {
  assert.equal(dayKey(at(2026, 10, 8, 3, 59), 4), '2026-10-07');
  assert.equal(dayKey(at(2026, 10, 8, 4, 0), 4), '2026-10-08');
  assert.equal(dayKey(at(2026, 10, 8, 0, 30), 0), '2026-10-08');
});

test('checkTask: star +1, events checked+first_today, cannot double check', () => {
  const r = checkTask(base(), 't1', T0);
  assert.equal(r.state.stars, 1);
  assert.deepEqual(r.events, ['checked', 'first_today']);
  assert.equal(r.state.today.done.t1, true);
  const r2 = checkTask(r.state, 't1', T0);
  assert.equal(r2.state.stars, 1); assert.deepEqual(r2.events, []);
  assert.deepEqual(checkTask(base(), 'nope', T0).events, []);
});

test('all_done: 5 checks → all_done event, streak 1, allDone true', () => {
  const { state, events } = checkAll(base(), T0);
  assert.ok(events.includes('all_done'));
  assert.equal(state.streak, 1); assert.equal(state.today.allDone, true);
  assert.equal(state.lastAllDoneKey, '2026-10-07');
});

test('rollover: next day resets done; streak kept if yesterday all done, else 0', () => {
  const s1 = checkAll(base(), T0).state;
  const s2 = rollover(s1, T0 + D);
  assert.equal(s2.today.key, '2026-10-08');
  assert.deepEqual(s2.today.done, {}); assert.equal(s2.today.allDone, false);
  assert.equal(s2.streak, 1);
  const s3 = rollover(s1, T0 + 2 * D); // skipped a day
  assert.equal(s3.streak, 0);
  assert.equal(rollover(s1, T0 + 1000).today.key, '2026-10-07'); // same day, unchanged
});

test('rollover: clock going backwards does not touch stars/streak', () => {
  const s1 = checkAll(base(), T0).state;
  const s2 = rollover(s1, T0 - 3 * D);
  assert.equal(s2.stars, 5); assert.equal(s2.streak, 1);
});

test('streak 3 → streak3 + medal, 7 → streak7 + trophy', () => {
  let s = base(); let ev = [];
  for (let d = 0; d < 7; d++) { const r = checkAll(rollover(s, T0 + d * D), T0 + d * D); s = r.state; ev.push(r.events); }
  assert.ok(ev[2].includes('streak3')); assert.equal(s.medals, 1);
  assert.ok(ev[6].includes('streak7')); assert.equal(s.trophies, 1);
  assert.equal(s.streak, 7);
});

test('uncheck then recheck same day does not double count streak', () => {
  let s = checkAll(base(), T0).state;
  s = uncheckTask(s, 't5', T0).state;
  assert.equal(s.today.allDone, false); assert.equal(s.stars, 4); assert.equal(s.streak, 1);
  const r = checkTask(s, 't5', T0);
  assert.ok(r.events.includes('all_done')); assert.equal(r.state.streak, 1);
});

test('uncheck: star -1 never below 0, unchecked event, noop if not done', () => {
  const r = uncheckTask(base(), 't1', T0);
  assert.deepEqual(r.events, []); assert.equal(r.state.stars, 0);
});

test('growth: 15 stars → child (grew), 50 → adult; not reverted by uncheck', () => {
  let s = base(); let grew = 0;
  for (let d = 0; d < 3; d++) { const r = checkAll(rollover(s, T0 + d * D), T0 + d * D); s = r.state; grew += r.events.filter((e) => e === 'grew').length; }
  assert.equal(s.stars, 15); assert.equal(stage(s), 'child'); assert.equal(grew, 1);
  const u = uncheckTask(s, 't5', T0 + 2 * D).state;
  assert.equal(u.stars, 14); assert.equal(stage(u), 'child');
  for (let d = 3; d < 10; d++) { s = checkAll(rollover(s, T0 + d * D), T0 + d * D).state; }
  assert.equal(stage(s), 'adult');
});

test('goal: reached event once when stars >= goal.stars', () => {
  let s = setGoal(base(), { text: '아이스크림', stars: 2 });
  const a = checkTask(s, 't1', T0); assert.ok(!a.events.includes('goal_reached'));
  const b = checkTask(a.state, 't2', T0); assert.ok(b.events.includes('goal_reached'));
  assert.equal(b.state.goal.reachedAt, T0);
  const c = checkTask(b.state, 't3', T0); assert.ok(!c.events.includes('goal_reached'));
  assert.equal(clearGoal(c.state).goal, null);
});

test('zero tasks: never all_done, no streak', () => {
  let s = base();
  for (const t of [...s.tasks]) s = removeTask(s, t.id);
  assert.equal(s.tasks.length, 0);
  assert.equal(rollover(s, T0 + D).today.allDone, false);
  assert.equal(rollover(s, T0 + D).streak, 0);
});

test('task CRUD', () => {
  let s = addTask(base(), { name: '피아노', icon: 'music', slot: 'day' });
  assert.equal(s.tasks.length, 6); assert.equal(s.tasks[5].id, 't6');
  s = updateTask(s, 't6', { name: '피아노 연습' });
  assert.equal(s.tasks[5].name, '피아노 연습');
  s = moveTask(s, 't6', -1);
  assert.equal(s.tasks[4].id, 't6');
  s = moveTask(s, 't1', -1); assert.equal(s.tasks[0].id, 't1'); // 맨 위에서 위로: 그대로
  s = removeTask(s, 't6'); assert.equal(s.tasks.length, 5);
  const done = checkTask(s, 't1', T0).state;
  assert.equal(removeTask(done, 't1').today.done.t1, undefined); // 삭제 시 오늘 체크도 제거
});

test('isSlotActive', () => {
  const h = (x) => at(2026, 10, 7, x);
  assert.equal(isSlotActive('morning', h(6)), true); assert.equal(isSlotActive('morning', h(11)), false);
  assert.equal(isSlotActive('day', h(11)), true); assert.equal(isSlotActive('day', h(17)), false);
  assert.equal(isSlotActive('evening', h(17)), true); assert.equal(isSlotActive('evening', h(3)), true);
  assert.equal(isSlotActive('evening', h(5)), false); assert.equal(isSlotActive('any', h(5)), true);
});
