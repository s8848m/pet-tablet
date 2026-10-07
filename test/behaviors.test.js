import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEHAVIORS, pickIdle, pickCare, forTask, forTouch, WAKE_ID, AUTOSLEEP_ID, RETURN_ID, NEGLECT_ID } from '../js/behaviors.js';

const GROUPS = ['idle','need','touch','feed','play','wash','sleep','asleepIdle','wake','autosleep','task','event'];
const PRESETS = {
  all: 'bob hop hop3 spin wobble squash shake dizzy lie sit crouch stretch hide peek float bounceLand dance jumpRope run walk roll tremble shrink lean tapGlass'.split(' '),
  head: 'tilt lookL lookR lookUp nod nodFast shakeHead bow sniff lookAround'.split(' '),
  arm: 'wave rub scratch raise hold clap cover thumb brush scribble point'.split(' '),
  legs: 'walk kick curl crawl'.split(' '),
  tail: ['wag'],
};
const partKind = (p) => (p === 'armL' || p === 'armR' || p === 'arms' ? 'arm' : p);
const ctx = (over = {}) => ({ stats: { hunger: 100, fun: 100, clean: 100, energy: 100 }, mood: 'happy', asleep: false, gloom: 0, hour: 12, result: null, returnedAfterDays: 0, ...over });
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('all 72 behaviors defined with valid fields', () => {
  for (let id = 1; id <= 72; id++) {
    const b = BEHAVIORS[id];
    assert.ok(b, `behavior ${id} missing`);
    assert.equal(b.id, id);
    assert.equal(typeof b.name, 'string');
    assert.ok(GROUPS.includes(b.group), `${id} bad group ${b.group}`);
    assert.ok(b.dur >= 300 && b.dur <= 8000, `${id} dur`);
    for (const [part, preset] of Object.entries(b.anim || {})) {
      assert.ok(PRESETS[partKind(part)], `${id} bad part ${part}`);
      assert.ok(PRESETS[partKind(part)].includes(preset), `${id} bad preset ${part}:${preset}`);
    }
  }
  assert.equal(Object.keys(BEHAVIORS).length, 72);
});

test('group counts match the spec', () => {
  const count = (g) => Object.values(BEHAVIORS).filter((b) => b.group === g).length;
  assert.equal(count('idle'), 20);
  assert.equal(count('need'), 9);   // 21~29. 30(달려와 안김)은 복귀 때 한 번만 트는 event
  assert.equal(count('touch'), 10);
  assert.equal(count('feed'), 5); assert.equal(count('play'), 6); assert.equal(count('wash'), 4);
  assert.equal(count('sleep') + count('asleepIdle') + count('wake') + count('autosleep'), 5);
  assert.equal(count('task'), 6);
  assert.equal(count('event'), 7);  // 30 + 67~72
});

test('pickIdle: full stats → only idle group; hungry → 21 appears; starving → 22', () => {
  for (let i = 0; i < 50; i++) assert.equal(BEHAVIORS[pickIdle(ctx(), Math.random)].group, 'idle');
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(pickIdle(ctx({ stats: { hunger: 30, fun: 100, clean: 100, energy: 100 } })));
  assert.ok(seen.has(21)); assert.ok(!seen.has(22));
  const seen2 = new Set();
  for (let i = 0; i < 300; i++) seen2.add(pickIdle(ctx({ stats: { hunger: 10, fun: 100, clean: 100, energy: 100 } })));
  assert.ok(seen2.has(22));
});

test('pickIdle: neglect → 28, sad mood → 29, asleep → 57/58 only', () => {
  const s = new Set(); for (let i = 0; i < 300; i++) s.add(pickIdle(ctx({ gloom: 3 })));
  assert.ok(s.has(28));
  const s2 = new Set(); for (let i = 0; i < 300; i++) s2.add(pickIdle(ctx({ mood: 'sad' })));
  assert.ok(s2.has(29));
  for (let i = 0; i < 50; i++) assert.ok([57, 58].includes(pickIdle(ctx({ asleep: true }))));
});

test('pickIdle is deterministic with injected rng', () => {
  assert.equal(pickIdle(ctx(), () => 0), 1);
  assert.equal(pickIdle(ctx(), () => 0.999), 20);
});

test('pickIdle: need:idle ≈ 2:1 when need matches; only #21 with hunger 30', () => {
  let count21 = 0;
  for (let i = 0; i < 3000; i++) {
    const id = pickIdle(ctx({ stats: { hunger: 30, fun: 100, clean: 100, energy: 100 } }));
    if (id === 21) count21++;
  }
  const share = count21 / 3000;
  assert.ok(share >= 0.60 && share <= 0.73, `#21 share ${share.toFixed(3)} outside [0.60, 0.73]`);
});

test('pickCare: feed ate → 41/42/44/45, refused → 43; wash already_clean → 55; sleep → 56', () => {
  for (let i = 0; i < 50; i++) assert.ok([41, 42, 44, 45].includes(pickCare('feed', ctx({ result: 'ate' }))));
  assert.equal(pickCare('feed', ctx({ result: 'refused' })), 43);
  for (let i = 0; i < 50; i++) assert.ok([46, 47, 48, 49, 50, 51].includes(pickCare('play', ctx({ result: 'played' }))));
  for (let i = 0; i < 50; i++) assert.ok([52, 53, 54].includes(pickCare('wash', ctx({ result: 'washed' }))));
  assert.equal(pickCare('wash', ctx({ result: 'already_clean' })), 55);
  assert.equal(pickCare('sleep', ctx({ result: 'slept' })), 56);
  assert.equal(WAKE_ID, 59); assert.equal(AUTOSLEEP_ID, 60); assert.equal(RETURN_ID, 30); assert.equal(NEGLECT_ID, 28);
});

test('pickCare with no matching conditions returns null', () => {
  assert.equal(pickCare('feed', ctx({ result: 'weird' })), null);
});

test('forTask maps icon/slot and events in order', () => {
  assert.deepEqual(forTask({ icon: 'brush', slot: 'morning' }, ['checked']), [61]);
  assert.deepEqual(forTask({ icon: 'brush', slot: 'evening' }, ['checked']), [62]);
  assert.deepEqual(forTask({ icon: 'pencil', slot: 'day' }, ['checked', 'first_today']), [63, 67]);
  assert.deepEqual(forTask({ icon: 'book', slot: 'any' }, ['checked']), [64]);
  assert.deepEqual(forTask({ icon: 'box', slot: 'evening' }, ['checked']), [65]);
  assert.deepEqual(forTask({ icon: 'music', slot: 'day' }, ['checked', 'all_done', 'streak3']), [66, 68, 69]);
  assert.deepEqual(forTask({ icon: 'star', slot: 'any' }, ['checked', 'all_done', 'streak7', 'grew', 'goal_reached']), [66, 71, 69, 72]);
  assert.deepEqual(forTask({ icon: 'star', slot: 'any' }, ['unchecked']), [70]);
});

test('forTouch maps all 10 gestures', () => {
  const m = { patHead: 31, pokeBelly: 32, touchFoot: 33, touchTail: 34, rapid: 35, long: 36, drag: 37, drop: 38, pinch: 39, background: 40 };
  for (const [g, id] of Object.entries(m)) assert.equal(forTouch(g), id);
});
