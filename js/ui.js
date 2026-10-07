import { hearts, isSlotActive } from './state.js';

export const ICON = { brush: '🪥', pencil: '✏️', book: '📖', box: '🧸', rice: '🍚', shirt: '👕', bag: '🎒', water: '💧', run: '🏃', music: '🎵', hello: '👋', star: '⭐' };
const SLOT_LABEL = { morning: '아침', day: '낮', evening: '저녁', any: '' };
const STAT_LABEL = { hunger: '🍚', fun: '⚽', clean: '🛁', energy: '⚡' };
const $ = (s) => document.querySelector(s);

export function createUI(handlers) {
  const screens = { hatch: $('#screen-hatch'), main: $('#screen-main'), settings: $('#screen-settings') };
  const ui = { petContainer: $('#pet-stage'), settingsRoot: $('#screen-settings') };

  ui.showScreen = (name) => { for (const [k, el] of Object.entries(screens)) el.hidden = k !== name; };

  // 알 고르기
  let pickedKind = null;
  for (const egg of document.querySelectorAll('.egg')) {
    egg.addEventListener('click', () => {
      document.querySelectorAll('.egg').forEach((e) => e.classList.remove('picked', 'shake'));
      egg.classList.add('picked', 'shake'); pickedKind = egg.dataset.kind;
      setTimeout(() => { $('#hatch-form').hidden = false; $('#hatch-name').focus(); }, 1500);
    });
  }
  $('#hatch-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#hatch-name').value.trim(), pin = $('#hatch-pin').value;
    if (!pickedKind || !name || !/^\d{4}$/.test(pin)) return;
    handlers.onHatch({ kind: pickedKind, name, pin });
  });

  // 메인 버튼
  for (const b of document.querySelectorAll('[data-care]')) b.addEventListener('click', () => handlers.onCare(b.dataset.care));
  $('#sound').addEventListener('click', () => handlers.onSoundToggle());
  let nameTimer = null;
  const nameEl = $('#pet-name');
  let nameDown = null;
  const nameCancel = () => { clearTimeout(nameTimer); nameDown = null; };
  nameEl.addEventListener('pointerdown', (e) => {
    nameCancel(); nameDown = { x: e.clientX, y: e.clientY };
    try { nameEl.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 */ }
    nameTimer = setTimeout(() => { nameDown = null; handlers.onNameLongPress(); }, 3000);
  });
  nameEl.addEventListener('pointermove', (e) => { if (nameDown && Math.hypot(e.clientX - nameDown.x, e.clientY - nameDown.y) > 30) nameCancel(); });
  for (const ev of ['pointerup', 'pointercancel']) nameEl.addEventListener(ev, nameCancel);
  nameEl.addEventListener('contextmenu', (e) => e.preventDefault());
  $('#task-list').addEventListener('click', (e) => { const li = e.target.closest('.task'); if (li) handlers.onTaskTap(li.dataset.id, li); });

  let taskSig = null;
  ui.render = (state, now) => {
    $('#hearts').innerHTML = Object.entries(STAT_LABEL).map(([k, lbl]) => {
      const n = hearts(state.stats[k]);
      return `<div><span class="lbl">${lbl}</span><span class="h">${'♥'.repeat(n)}<span class="off">${'♥'.repeat(5 - n)}</span></span></div>`;
    }).join('');
    nameEl.textContent = state.pet.name;
    $('#star-count').textContent = state.stars;
    $('#sound').textContent = state.settings.sound ? '🔊' : '🔇';
    $('#badges').textContent = (state.today.allDone ? '👑' : '') + '🏅'.repeat(Math.min(state.medals, 5)) + '🏆'.repeat(Math.min(state.trophies, 5));
    const goal = $('#goal');
    if (state.goal) {
      goal.hidden = false;
      const pct = Math.min(100, Math.round((state.stars / state.goal.stars) * 100));
      $('#goal-fill').style.width = `${pct}%`;
      $('#goal-text').textContent = state.goal.reachedAt ? `🎁 ${state.goal.text} 달성!` : `⭐${state.goal.stars}개 → ${state.goal.text}`;
    } else goal.hidden = true;
    const rows = state.tasks.map((t) => {
      const done = !!state.today.done[t.id];
      const dim = !done && !isSlotActive(t.slot, now);
      return { t, done, dim };
    });
    // 1초마다 다시 그리면 탭이 사라지므로, 내용이 바뀐 때만 목록 DOM을 새로 만든다
    const sig = JSON.stringify(rows.map(({ t, done, dim }) => [t.id, t.name, t.icon, t.slot, done, dim]));
    if (sig !== taskSig) {
      taskSig = sig;
      $('#task-list').innerHTML = rows.map(({ t, done, dim }) => `<li class="task ${done ? 'done' : ''} ${dim ? 'dim' : ''}" data-id="${escapeHtml(t.id)}">
        <button class="check" aria-label="${escapeHtml(t.name)}">${done ? '✓' : ICON[t.icon] || '⭐'}</button>
        <div class="label">${escapeHtml(t.name)}<small>${SLOT_LABEL[t.slot] || ''}</small></div></li>`).join('');
    }
    for (const b of document.querySelectorAll('[data-care]')) b.classList.toggle('disabled', state.asleep && b.dataset.care !== 'sleep');
  };

  ui.flyStar = (fromEl) => {
    const from = fromEl.getBoundingClientRect(), to = $('#star-count').getBoundingClientRect();
    const s = document.createElement('div'); s.className = 'fly-star'; s.textContent = '⭐';
    s.style.left = `${from.left + from.width / 2}px`; s.style.top = `${from.top}px`;
    document.body.appendChild(s);
    requestAnimationFrame(() => { s.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.6)`; s.style.opacity = '0'; });
    setTimeout(() => s.remove(), 900);
  };

  function dialog(html) {
    const ov = $('#overlay'), dg = $('#dialog');
    dg.innerHTML = html; ov.hidden = false;
    return { dg, close: () => { ov.hidden = true; dg.innerHTML = ''; } };
  }
  ui.confirm = (text) => new Promise((resolve) => {
    const { dg, close } = dialog(`<div>${escapeHtml(text)}</div><div class="row"><button class="primary" data-v="1">네</button><button data-v="0">아니요</button></div>`);
    dg.onclick = (e) => { const v = e.target.dataset.v; if (v === undefined) return; close(); resolve(v === '1'); };
  });
  ui.askPin = (expected) => new Promise((resolve) => {
    let tries = 0;
    const { dg, close } = dialog(`<div class="grownup">아빠 비밀번호</div><input type="password" inputmode="numeric" maxlength="4" autofocus><div class="row"><button class="primary" data-v="ok">확인</button><button data-v="no">취소</button></div>`);
    const input = dg.querySelector('input'); input.focus();
    const submit = () => {
      if (input.value === expected) { close(); resolve(true); return; }
      tries++; dg.classList.remove('shake'); void dg.offsetWidth; dg.classList.add('shake'); input.value = '';
      if (tries >= 3) { close(); resolve(false); }
    };
    dg.onclick = (e) => { if (e.target.dataset.v === 'ok') submit(); if (e.target.dataset.v === 'no') { close(); resolve(false); } };
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
  });
  let toastTimer;
  ui.toast = (text) => { const t = $('#toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1800); };

  return ui;
}

export function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
