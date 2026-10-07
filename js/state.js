import { clock } from './clock.js';

export const CURRENT_VERSION = 1;
export const STAT_KEYS = ['hunger', 'fun', 'clean', 'energy'];
export const DECAY_HOURS = { hunger: 12, fun: 10, clean: 24, energy: 16 };
export const SLEEP_RECOVER_HOURS = 2;
export const MAX_CATCHUP_MS = 48 * 3600 * 1000;
export const GAIN = { feed: 40, play: 35, wash: 60, pet: 3 };
export const REFUSE = { feed: 85, wash: 90, sleep: 95 };
export const PET_BONUS_INTERVAL_MS = 60 * 1000;
export const NEGLECT_DAYS = 2;
export const DAY_MS = 24 * 3600 * 1000;

export const TASK_ICONS = ['brush', 'pencil', 'book', 'box', 'rice', 'shirt', 'bag', 'water', 'run', 'music', 'hello', 'star'];
export const DEFAULT_TASKS = [
  { id: 't1', name: '아침 양치', icon: 'brush', slot: 'morning' },
  { id: 't2', name: '숙제', icon: 'pencil', slot: 'day' },
  { id: 't3', name: '책 읽기', icon: 'book', slot: 'any' },
  { id: 't4', name: '장난감 정리', icon: 'box', slot: 'evening' },
  { id: 't5', name: '저녁 양치', icon: 'brush', slot: 'evening' },
];

const hoursMs = (h) => h * 3600 * 1000;
export const clamp = (n) => Math.max(0, Math.min(100, n));

export function dayKey(now, resetHour = 4) {
  const d = new Date(now - hoursMs(resetHour));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function createInitialState({ kind, name, pin }, now = clock.now()) {
  return {
    version: CURRENT_VERSION,
    pet: { kind, name, hatchedAt: now },
    stats: { hunger: 100, fun: 100, clean: 100, energy: 100 },
    statsAt: now,
    asleep: false,
    stars: 0,
    petBonusAt: 0,
    tasks: DEFAULT_TASKS.map((t) => ({ ...t })),
    today: { key: dayKey(now, 4), done: {}, allDone: false },
    streak: 0,
    lastAllDoneKey: null,
    medals: 0,
    trophies: 0,
    goal: null,
    growth: { stage: 'baby', childAt: null, adultAt: null },
    gloom: 0,
    settings: { pin, resetHour: 4, childStars: 15, adultStars: 50, sound: true },
    lastSeenAt: now,
    lastCareAt: now,
  };
}

export function applyTime(state, now = clock.now()) {
  const elapsed = Math.min(Math.max(0, now - state.statsAt), MAX_CATCHUP_MS);
  if (process.env.DEBUG_APPLY) console.log('[applyTime] elapsed:', elapsed, 'now:', now, 'statsAt:', state.statsAt);
  if (elapsed === 0) return state;
  const stats = { ...state.stats };
  let asleep = state.asleep;
  const slow = asleep ? 0.5 : 1;
  for (const k of ['hunger', 'fun', 'clean']) {
    stats[k] = clamp(stats[k] - 100 * (elapsed / hoursMs(DECAY_HOURS[k])) * slow);
  }
  if (asleep) {
    stats.energy = clamp(stats.energy + 100 * (elapsed / hoursMs(SLEEP_RECOVER_HOURS)));
    if (stats.energy >= 100) asleep = false;
  } else {
    stats.energy = clamp(stats.energy - 100 * (elapsed / hoursMs(DECAY_HOURS.energy)));
  }
  return { ...state, stats, statsAt: now, asleep };
}

export function hearts(v) {
  if (v >= 80) return 5;
  if (v >= 60) return 4;
  if (v >= 40) return 3;
  if (v >= 20) return 2;
  return v > 0 ? 1 : 0;
}

export function mood(state) {
  if (state.asleep) return 'asleep';
  const avg = STAT_KEYS.reduce((a, k) => a + state.stats[k], 0) / STAT_KEYS.length;
  if (avg >= 80) return 'happy';
  if (avg >= 55) return 'normal';
  if (avg >= 35) return 'gloomy';
  return 'sad';
}

function cared(state, now) {
  return { ...state, lastCareAt: now, gloom: Math.max(0, state.gloom - 1) };
}
function bump(state, key, amount) {
  return { ...state, stats: { ...state.stats, [key]: clamp(state.stats[key] + amount) } };
}

export function feed(state, now = clock.now()) {
  const s = applyTime(state, now);
  if (s.asleep) return { state: s, result: 'asleep' };
  if (s.stats.hunger >= REFUSE.feed) return { state: s, result: 'refused' };
  return { state: cared(bump(s, 'hunger', GAIN.feed), now), result: 'ate' };
}

export function play(state, now = clock.now()) {
  const s = applyTime(state, now);
  if (s.asleep) return { state: s, result: 'asleep' };
  return { state: cared(bump(s, 'fun', GAIN.play), now), result: 'played' };
}

export function wash(state, now = clock.now()) {
  const s = applyTime(state, now);
  if (s.asleep) return { state: s, result: 'asleep' };
  if (s.stats.clean >= REFUSE.wash) return { state: s, result: 'already_clean' };
  return { state: cared(bump(s, 'clean', GAIN.wash), now), result: 'washed' };
}

export function sleepPet(state, now = clock.now()) {
  const s = applyTime(state, now);
  if (s.asleep) return { state: s, result: 'already' };
  if (s.stats.energy >= REFUSE.sleep) return { state: s, result: 'not_sleepy' };
  return { state: cared({ ...s, asleep: true }, now), result: 'slept' };
}

export function wake(state, now = clock.now()) {
  const s = applyTime(state, now);
  if (!s.asleep) return { state: s, result: 'already_awake' };
  return { state: { ...s, asleep: false }, result: 'woke' };
}

export function petTouch(state, now = clock.now()) {
  const s = applyTime(state, now);
  if (s.asleep || now - s.petBonusAt < PET_BONUS_INTERVAL_MS) return { state: s, bonus: false };
  return { state: { ...bump(s, 'fun', GAIN.pet), petBonusAt: now }, bonus: true };
}

export function shouldAutoSleep(state, now = clock.now()) {
  if (state.asleep) return false;
  const h = new Date(now).getHours();
  const night = h >= 22 || h < 4;
  return night && state.stats.energy < 30;
}

function yesterdayKey(now, resetHour) { return dayKey(now - DAY_MS, resetHour); }

export function rollover(state, now = clock.now()) {
  const key = dayKey(now, state.settings.resetHour);
  if (key <= state.today.key) return state; // 같은 날이거나 시계가 뒤로 간 경우: 건드리지 않음
  const streak = state.lastAllDoneKey === yesterdayKey(now, state.settings.resetHour) ? state.streak : 0;
  return { ...state, today: { key, done: {}, allDone: false }, streak };
}

export function stage(state) { return state.growth.stage; }

function afterStarsChanged(state, now) {
  const events = [];
  let s = state;
  if (s.growth.stage === 'baby' && s.stars >= s.settings.childStars) {
    s = { ...s, growth: { ...s.growth, stage: 'child', childAt: now } }; events.push('grew');
  }
  if (s.growth.stage === 'child' && s.stars >= s.settings.adultStars) {
    s = { ...s, growth: { ...s.growth, stage: 'adult', adultAt: now } }; events.push('grew');
  }
  if (s.goal && !s.goal.reachedAt && s.stars >= s.goal.stars) {
    s = { ...s, goal: { ...s.goal, reachedAt: now } }; events.push('goal_reached');
  }
  return { state: s, events };
}

export function checkTask(state, taskId, now = clock.now()) {
  let s = rollover(applyTime(state, now), now);
  if (!s.tasks.some((t) => t.id === taskId) || s.today.done[taskId]) return { state: s, events: [] };
  const events = ['checked'];
  const wasEmpty = Object.keys(s.today.done).length === 0;
  const done = { ...s.today.done, [taskId]: true };
  if (wasEmpty) events.push('first_today');
  const allDone = s.tasks.length > 0 && s.tasks.every((t) => done[t.id]);
  s = { ...s, stars: s.stars + 1, today: { ...s.today, done, allDone } };
  if (allDone) {
    events.push('all_done');
    if (s.lastAllDoneKey !== s.today.key) {
      const streak = s.lastAllDoneKey === yesterdayKey(now, s.settings.resetHour) ? s.streak + 1 : 1;
      s = { ...s, streak, lastAllDoneKey: s.today.key };
      if (streak % 7 === 0) { s = { ...s, trophies: s.trophies + 1 }; events.push('streak7'); }
      else if (streak % 7 === 3) { s = { ...s, medals: s.medals + 1 }; events.push('streak3'); }
    }
  }
  const g = afterStarsChanged(s, now);
  return { state: g.state, events: events.concat(g.events) };
}

export function uncheckTask(state, taskId, now = clock.now()) {
  let s = rollover(applyTime(state, now), now);
  if (!s.today.done[taskId]) return { state: s, events: [] };
  const done = { ...s.today.done }; delete done[taskId];
  s = { ...s, stars: Math.max(0, s.stars - 1), today: { ...s.today, done, allDone: false } };
  return { state: s, events: ['unchecked'] };
}

export function setGoal(state, { text, stars }) { return { ...state, goal: { text, stars: Number(stars), reachedAt: null } }; }
export function clearGoal(state) { return { ...state, goal: null }; }

export function addTask(state, { name, icon, slot }) {
  const max = state.tasks.reduce((m, t) => Math.max(m, Number(t.id.slice(1)) || 0), 0);
  return { ...state, tasks: [...state.tasks, { id: `t${max + 1}`, name, icon, slot }] };
}
export function updateTask(state, id, patch) {
  return { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, id } : t)) };
}
export function removeTask(state, id) {
  const done = { ...state.today.done }; delete done[id];
  return { ...state, tasks: state.tasks.filter((t) => t.id !== id), today: { ...state.today, done } };
}
export function moveTask(state, id, dir) {
  const tasks = [...state.tasks];
  const i = tasks.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tasks.length) return state;
  [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  return { ...state, tasks };
}

export function isSlotActive(slot, now = clock.now()) {
  const h = new Date(now).getHours();
  if (slot === 'any') return true;
  if (slot === 'morning') return h >= 6 && h < 11;
  if (slot === 'day') return h >= 11 && h < 17;
  if (slot === 'evening') return h >= 17 || h < 4;
  return true;
}
