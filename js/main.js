import { clock } from './clock.js';
import * as S from './state.js';
import { BEHAVIORS, pickIdle, pickCare, forTask, forTouch, WAKE_ID, AUTOSLEEP_ID, RETURN_ID } from './behaviors.js';
import { createStorage, STORAGE_KEY } from './storage.js';
import { createPetView } from './pet-view.js';
import { createUI } from './ui.js';
import { createSound } from './sound.js';
import { mountSettings } from './settings.js';

const storage = createStorage();
const sound = createSound();
let state = null, view = null, idleTimer = null;
let lastWakeAt = -Infinity; // 깨운 직후 자동 재취침 방지용(저장 안 함)
const WAKE_GRACE_MS = 20 * 60 * 1000;
const MOOD_FACE = { happy: 'happy', normal: 'normal', gloomy: 'sad', sad: 'cry', asleep: 'sleep' };

const ui = createUI({ onCare, onTaskTap, onNameLongPress, onSoundToggle, onHatch });

function ctx(extra = {}) {
  const now = clock.now();
  return { stats: state.stats, mood: S.mood(state), asleep: state.asleep, gloom: state.gloom, hour: new Date(now).getHours(), result: null, returnedAfterDays: 0, ...extra };
}
let lastSaveWarn = -Infinity;
function persist(s) {
  if (storage.save(s)) return;
  if (clock.now() - lastSaveWarn >= 60_000) { lastSaveWarn = clock.now(); ui.toast('저장이 안 돼요'); }
}
const SLEEP_POSE = { all: 'lie', prop: { id: 'blanket', slot: 'front' } };
function commit(next) { state = next; persist(state); render(); }
function render() {
  ui.render(state, clock.now());
  view.setStage(state.growth.stage);
  view.setGloom(state.gloom);
  view.setRoom(state.asleep ? 'dark' : null); // 행동 중이면 view 가 기본값만 기억해 둔다
  view.setPose(state.asleep ? SLEEP_POSE : null);
  if (!view.isPlaying()) { // 행동 중(욕실·파티 배경)엔 표정을 건드리지 않는다
    view.setFace(MOOD_FACE[S.mood(state)]);
  }
}

let playSeq = 0;
async function playIds(ids) {
  clearTimeout(idleTimer);
  const mine = ++playSeq; // 새 재생이 시작되면 옛 재생열은 남은 행동을 버린다
  try {
    for (const id of ids) {
      if (mine !== playSeq) return;
      const b = BEHAVIORS[id]; if (b.sound) sound.play(b.sound);
      await view.play(b, { restFace: MOOD_FACE[S.mood(state)] });
    }
  } finally {
    if (mine === playSeq) scheduleIdle(); // 행동 조회·재생이 실패해도 아이들 타이머는 이어진다
  }
}
function scheduleIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (document.querySelector('#screen-main').hidden || view.isPlaying()) scheduleIdle(); else playIds([pickIdle(ctx())]); }, 2500 + Math.random() * 3500);
}

function wakeUp() {
  lastWakeAt = clock.now();
  const r = S.wake(state); commit(r.state); playIds([WAKE_ID]);
}

function onCare(kind) {
  if (state.asleep) { wakeUp(); return; }
  const fn = { feed: S.feed, play: S.play, wash: S.wash, sleep: S.sleepPet }[kind];
  const r = fn(state); commit(r.state);
  if (r.result === 'not_sleepy') { ui.toast('아직 안 졸려요'); return; }
  const id = pickCare(kind, ctx({ result: r.result }));
  if (id != null) playIds([id]);
}

async function onTaskTap(taskId) {
  if (state.today.done[taskId]) {
    if (!(await ui.confirm('정말 취소할까?'))) return;
    const r = S.uncheckTask(state, taskId); commit(r.state);
    if (r.events.length) playIds(forTask({}, r.events));
    return;
  }
  const task = state.tasks.find((t) => t.id === taskId);
  const r = S.checkTask(state, taskId); commit(r.state);
  if (!r.events.length) return;
  const check = document.querySelector(`.task[data-id="${CSS.escape(taskId)}"] .check`); // commit 뒤 다시 그려진 요소
  if (check) ui.flyStar(check);
  sound.play('star');
  if (r.events.includes('grew')) ui.toast(`${state.pet.name}가 자랐어요!`);
  playIds(forTask(task, r.events));
}

async function onNameLongPress() {
  if (await ui.askPin(state.settings.pin)) { playSeq++; clearTimeout(idleTimer); view.stop(); ui.showScreen('settings'); }
}
function onSoundToggle() { commit({ ...state, settings: { ...state.settings, sound: !state.settings.sound } }); sound.setEnabled(state.settings.sound); }
function onHatch({ kind, name, pin }) {
  commitNew(S.createInitialState({ kind, name, pin }));
  playIds([67, 12]);
}
function commitNew(s) {
  state = s; persist(state);
  view.setKind(state.pet.kind);
  ui.showScreen('main'); render();
}

function onGesture(g) {
  if (state.asleep) { wakeUp(); return; }
  if (g === 'patHead') { const r = S.petTouch(state); commit(r.state); }
  if (g === 'drag') { playSeq++; clearTimeout(idleTimer); view.stop(); view.setFace('surprised'); return; }
  const id = forTouch(g);
  if (id != null) playIds([id]);
}

let tickCount = 0;
function tick() {
  if (!state) return;
  const before = state;
  const next = S.rollover(S.applyTime(state), clock.now());
  if (next !== before) { state = next; render(); if (++tickCount % 10 === 0) persist(state); } // 10초마다 저장(버튼은 즉시 저장)
  const mainVisible = !document.querySelector('#screen-main').hidden && document.querySelector('#overlay').hidden;
  if (mainVisible && clock.now() - lastWakeAt >= WAKE_GRACE_MS && S.shouldAutoSleep(state)) { const r = S.sleepPet(state); commit(r.state); playIds([AUTOSLEEP_ID]); }
}

function setFromSettings(s) { // 설정 화면의 저장: 화면 전환 없이 저장·렌더만
  const kindChanged = !state || s.pet.kind !== state.pet.kind;
  state = s; persist(state);
  if (kindChanged) view.setKind(state.pet.kind);
  sound.setEnabled(state.settings.sound);
  render();
}

function boot() {
  view = createPetView(ui.petContainer, { kind: 'mochi' });
  view.onGesture(onGesture);
  mountSettings(ui, () => state, setFromSettings, { storage, sound, view, behaviors: BEHAVIORS, onReset: () => { playSeq++; clearTimeout(idleTimer); state = null; }, onClose: () => { ui.showScreen('main'); render(); scheduleIdle(); } });
  setInterval(tick, 1000); // state가 null이면 tick은 아무것도 안 한다 (부화 전)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state) return;
    const o = S.openApp(state); commit(o.state);
    if (!document.querySelector('#screen-settings').hidden) return; // 설정 중엔 연출 없이 상태만 갱신
    if (o.returnedAfterDays >= S.NEGLECT_DAYS) playIds([RETURN_ID]); else scheduleIdle();
  });
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller; // 첫 방문엔 새로고침하지 않는다
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  const loaded = storage.load();
  if (!loaded) {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) localStorage.setItem('pet-tablet.broken', raw); } catch { /* 저장소 접근 불가 */ }
    ui.showScreen('hatch'); return;
  }
  const r = S.openApp(loaded);
  state = r.state; persist(state);
  view.setKind(state.pet.kind);
  sound.setEnabled(state.settings.sound);
  ui.showScreen('main'); render();
  if (state.asleep) scheduleIdle(); else playIds([r.returnedAfterDays >= S.NEGLECT_DAYS ? RETURN_ID : 12]);
}
window.__pet = { get state() { return state; }, get view() { return view; }, ui, BEHAVIORS };
boot();
