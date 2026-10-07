import { clock } from './clock.js';
import * as S from './state.js';
import { BEHAVIORS, pickIdle, pickCare, forTask, forTouch, WAKE_ID, AUTOSLEEP_ID, RETURN_ID } from './behaviors.js';
import { createStorage } from './storage.js';
import { createPetView } from './pet-view.js';
import { createUI } from './ui.js';
import { createSound } from './sound.js';
import { mountSettings } from './settings.js';

const storage = createStorage();
const sound = createSound();
let state = null, view = null, idleTimer = null;
const MOOD_FACE = { happy: 'happy', normal: 'normal', gloomy: 'sad', sad: 'cry', asleep: 'sleep' };

const ui = createUI({ onCare, onTaskTap, onNameLongPress, onSoundToggle, onHatch });

function ctx(extra = {}) {
  const now = clock.now();
  return { stats: state.stats, mood: S.mood(state), asleep: state.asleep, gloom: state.gloom, hour: new Date(now).getHours(), result: null, returnedAfterDays: 0, ...extra };
}
function commit(next) { state = next; storage.save(state); render(); }
function render() {
  ui.render(state, clock.now());
  view.setStage(state.growth.stage);
  view.setGloom(state.gloom);
  if (!view.isPlaying()) { // 행동 중(욕실·파티 배경)엔 방·표정을 건드리지 않는다
    view.setRoom(state.asleep ? 'dark' : null);
    view.setFace(MOOD_FACE[S.mood(state)]);
  }
}

let playSeq = 0;
async function playIds(ids) {
  clearTimeout(idleTimer);
  const mine = ++playSeq; // 새 재생이 시작되면 옛 재생열은 남은 행동을 버린다
  for (const id of ids) {
    if (mine !== playSeq) return;
    const b = BEHAVIORS[id]; if (b.sound) sound.play(b.sound);
    await view.play(b, { restFace: MOOD_FACE[S.mood(state)] });
  }
  if (mine === playSeq) scheduleIdle();
}
function scheduleIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!view.isPlaying()) playIds([pickIdle(ctx())]); else scheduleIdle(); }, 2500 + Math.random() * 3500);
}

function onCare(kind) {
  if (state.asleep) { const r = S.wake(state); commit(r.state); playIds([WAKE_ID]); return; }
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
  state = s; storage.save(state);
  view.setKind(state.pet.kind);
  ui.showScreen('main'); render();
}

function onGesture(g) {
  if (state.asleep) { const r = S.wake(state); commit(r.state); playIds([WAKE_ID]); return; }
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
  if (next !== before) { state = next; render(); if (++tickCount % 10 === 0) storage.save(state); } // 10초마다 저장(버튼은 즉시 저장)
  if (S.shouldAutoSleep(state)) { const r = S.sleepPet(state); commit(r.state); playIds([AUTOSLEEP_ID]); }
}

function setFromSettings(s) { // 설정 화면의 저장: 화면 전환 없이 저장·렌더만
  const kindChanged = !state || s.pet.kind !== state.pet.kind;
  state = s; storage.save(state);
  if (kindChanged) view.setKind(state.pet.kind);
  sound.setEnabled(state.settings.sound);
  render();
}

function boot() {
  view = createPetView(ui.petContainer, { kind: 'mochi' });
  view.onGesture(onGesture);
  mountSettings(ui, () => state, setFromSettings, { storage, sound, view, behaviors: BEHAVIORS, onClose: () => { ui.showScreen('main'); render(); scheduleIdle(); } });
  setInterval(tick, 1000); // state가 null이면 tick은 아무것도 안 한다 (부화 전)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state) { const o = S.openApp(state); commit(o.state); } });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const loaded = storage.load();
  if (!loaded) { ui.showScreen('hatch'); return; }
  const r = S.openApp(loaded);
  state = r.state; storage.save(state);
  view.setKind(state.pet.kind);
  sound.setEnabled(state.settings.sound);
  ui.showScreen('main'); render();
  playIds([r.returnedAfterDays >= S.NEGLECT_DAYS ? RETURN_ID : 12]);
}
window.__pet = { get state() { return state; }, get view() { return view; }, ui, BEHAVIORS };
boot();
