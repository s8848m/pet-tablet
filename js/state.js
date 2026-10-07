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
