import { petSvg, FACES } from './pet-svg.js';

const FX = {
  hearts:   { glyphs: ['♥'], color: '#ff6b81', n: 5 },
  stars:    { glyphs: ['★', '✦'], color: '#ffd43b', n: 6 },
  bubbles:  { glyphs: ['○'], color: '#74c0fc', n: 8 },
  zzz:      { glyphs: ['z', 'Z'], color: '#748ffc', n: 3 },
  notes:    { glyphs: ['♪', '♫'], color: '#845ef7', n: 4 },
  confetti: { glyphs: ['▮', '●', '▲'], color: null, n: 18, cls: 'conf' },
  sweat:    { glyphs: ['💧'], color: '#4dabf7', n: 2 },
  rain:     { glyphs: ['|'], color: '#4dabf7', n: 8, cls: 'rain' },
  flies:    { glyphs: ['•'], color: '#222', n: 3, cls: 'orbit' },
  sparkle:  { glyphs: ['✧', '✦'], color: '#fff3bf', n: 6 },
  dust:     { glyphs: ['☁'], color: '#ced4da', n: 3 },
  question: { glyphs: ['?'], color: '#495057', n: 1 },
  crumbs:   { glyphs: ['·'], color: '#b08968', n: 6 },
  drops:    { glyphs: ['💧'], color: '#4dabf7', n: 6 },
  tickle:   { glyphs: ['ㅋ', 'ㅎ'], color: '#ff922b', n: 5 },
};
const CONF_COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#845ef7'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createPetView(container, { kind = 'mochi' } = {}) {
  container.classList.add('pet-stage');
  let svg, pet, parts, slots, fxLayer, bubble, bubbleText;
  let token = 0, playing = false, face = 'normal', stage = 'baby', gestureCb = null, x = 0, baseRoom = null, pose = null, poseSlot = null, resetPointers = () => {};

  function mount(k) {
    container.innerHTML = petSvg(k);
    svg = container.querySelector('svg');
    pet = svg.querySelector('.pet');
    parts = {};
    for (const p of ['all', 'tail', 'legs', 'body', 'armL', 'armR', 'head']) parts[p] = svg.querySelector(`[data-part="${p}"]`);
    slots = {};
    for (const s of ['handR', 'handL', 'front', 'head', 'floor', 'above']) slots[s] = svg.querySelector(`[data-slot="${s}"]`);
    fxLayer = svg.querySelector('[data-part="fx"]');
    bubble = svg.querySelector('[data-part="bubble"]');
    bubbleText = bubble.querySelector('text');
    pet.dataset.stage = stage;
    applyFace(face);
    poseSlot = null; applyBase();
    if (baseRoom) container.dataset.room = baseRoom;
    pet.style.setProperty('--x', `${x}px`);
    bindGestures();
  }

  function applyFace(name) {
    face = FACES[name] ? name : 'normal';
    const [eyes, mouth] = FACES[face];
    svg.querySelectorAll('[data-eyes]').forEach((g) => g.classList.toggle('on', g.dataset.eyes === eyes));
    svg.querySelectorAll('[data-mouth]').forEach((g) => g.classList.toggle('on', g.dataset.mouth === mouth));
  }

  function clearAnim() {
    for (const el of Object.values(parts)) {
      for (const c of [...el.classList]) if (c.startsWith('a-')) el.classList.remove(c);
    }
    for (const s of Object.values(slots)) s.innerHTML = '';
    fxLayer.innerHTML = '';
    bubble.style.display = 'none';
    if (baseRoom) container.dataset.room = baseRoom; else container.removeAttribute('data-room');
    pet.classList.remove('moving');
    poseSlot = null; applyBase();
  }

  // 지속 자세(잠잘 때 누운 채 이불): 애니메이션 없이 최종 모습만 유지한다. 여러 번 불러도 안전.
  function applyBase() {
    parts.all.classList.toggle('a-lying', !!pose && pose.all === 'lie');
    const want = pose && pose.prop && slots[pose.prop.slot] ? pose.prop : null;
    if (poseSlot && (!want || want.slot !== poseSlot)) { slots[poseSlot].innerHTML = ''; poseSlot = null; }
    if (want && !slots[want.slot].childElementCount) { showProp(want); poseSlot = want.slot; }
  }

  function spawnFx(name) {
    const f = FX[name]; if (!f) return;
    for (let i = 0; i < f.n; i++) {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', `fx ${f.cls || ''}`);
      t.setAttribute('x', 150 + (Math.random() - 0.5) * 160);
      t.setAttribute('y', f.cls === 'rain' ? 60 : 120 + (Math.random() - 0.5) * 120);
      t.setAttribute('fill', f.color || CONF_COLORS[i % CONF_COLORS.length]);
      t.style.animationDelay = `${Math.random() * 0.6}s`;
      t.textContent = f.glyphs[i % f.glyphs.length];
      fxLayer.appendChild(t);
    }
  }

  function showProp(prop) {
    if (!prop || !slots[prop.slot]) return;
    // <use> 는 회전하는 부모 안에서 Chrome 이 변환을 빠뜨리는 경우가 있어(누운 자세의 이불), 기호 내용을 직접 복제해 넣는다.
    const sym = svg.querySelector(`#p-${prop.id}`);
    if (!sym) return;
    const g = document.createElementNS(SVG_NS, 'g');
    for (const n of sym.childNodes) g.appendChild(n.cloneNode(true));
    slots[prop.slot].appendChild(g);
  }

  function showBubble(text) {
    bubbleText.textContent = Array.isArray(text) ? text[Math.floor(Math.random() * text.length)] : text; bubble.style.display = 'inline';
  }

  async function play(b, opts = {}) {
    stop();
    const my = ++token; playing = true;
    if (b.face) applyFace(b.face);
    for (const [part, preset] of Object.entries(b.anim || {})) {
      if (part === 'arms') { parts.armL.classList.add(`a-${preset}`); parts.armR.classList.add(`a-${preset}`); }
      else parts[part]?.classList.add(`a-${preset}`);
    }
    if (b.prop && poseSlot) { slots[poseSlot].innerHTML = ''; poseSlot = null; } // 행동 소품이 자세 소품을 대신한다
    if (b.anim && b.anim.all && b.anim.all !== 'lie') parts.all.classList.remove('a-lying');
    showProp(b.prop);
    if (b.room) container.dataset.room = b.room;
    if (b.fx) spawnFx(b.fx);
    if (b.bubble) showBubble(b.bubble);
    if (b.move) {
      const dir = opts.dir ?? (Math.random() < 0.5 ? -1 : 1);
      x = b.move.x === 0 ? 0 : Math.abs(b.move.x) * dir;
      pet.classList.add('moving');
      pet.style.setProperty('--move-dur', `${b.dur}ms`);
      pet.style.setProperty('--x', `${x}px`);
    }
    await sleep(b.dur);
    if (my !== token) return;
    clearAnim();
    if (b.face && b.face !== 'sleep') applyFace(opts.restFace || 'normal');
    playing = false;
  }

  function stop() { token++; playing = false; clearAnim(); }

  // 제스처: 탭(부위별)·연타·길게·드래그·놓기·핀치·배경
  function bindGestures() {
    let downAt = 0, downX = 0, downY = 0, longTimer = null, dragging = false, downInPet = false, downPart, pinched = false, taps = [], pointers = new Set();
    const dropVisual = () => { pet.style.removeProperty('--y'); pet.style.setProperty('--x', `${x}px`); pet.style.removeProperty('transition'); };
    resetPointers = () => { pointers.clear(); clearTimeout(longTimer); if (dragging || pinched) dropVisual(); dragging = false; pinched = false; };
    const emit = (g, d) => gestureCb && gestureCb(g, d || {});
    svg.addEventListener('pointerdown', (e) => {
      pointers.add(e.pointerId);
      if (pointers.size === 2) { clearTimeout(longTimer); pinched = true; emit('pinch'); return; }
      downAt = performance.now(); downX = e.clientX; downY = e.clientY; dragging = false;
      // setPointerCapture 뒤에는 move/up 의 e.target 이 svg 가 되므로, 누른 대상은 여기서 기억해 둔다.
      downInPet = !!e.target.closest('.pet');
      downPart = e.target.closest('[data-part]')?.dataset.part;
      longTimer = setTimeout(() => { if (!dragging && downInPet) emit('long'); }, 600);
      try { svg.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 */ }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId) || pointers.size > 1 || pinched) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (!dragging && Math.hypot(dx, dy) > 15 && downInPet) { dragging = true; clearTimeout(longTimer); pet.style.transition = 'none'; emit('drag'); }
      if (dragging) {
        const scale = 300 / svg.getBoundingClientRect().width;
        pet.classList.remove('moving');
        pet.style.setProperty('--x', `${x + dx * scale}px`);
        pet.style.setProperty('--y', `${Math.min(0, dy * scale)}px`);
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId); clearTimeout(longTimer);
      if (pointers.size > 0) return;
      if (pinched) { pinched = false; dragging = false; dropVisual(); return; }
      if (dragging) { dragging = false; x = Math.max(-140, Math.min(140, x + (e.clientX - downX) * (300 / svg.getBoundingClientRect().width))); pet.style.setProperty('--x', `${x}px`); pet.style.removeProperty('--y'); pet.style.removeProperty('transition'); emit('drop'); return; }
      if (performance.now() - downAt > 600) return; // long 이미 처리
      const now = performance.now(); taps = taps.filter((t) => now - t < 1200); taps.push(now);
      if (taps.length >= 4) { taps = []; emit('rapid'); return; }
      const p = downPart;
      if (!downInPet) return emit('background');
      if (p === 'head' || p === 'eyes' || p === 'mouth') return emit('patHead');
      if (p === 'legs') return emit('touchFoot');
      if (p === 'tail') return emit('touchTail');
      return emit('pokeBelly');
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('lostpointercapture', (e) => { pointers.delete(e.pointerId); if (pointers.size === 0) resetPointers(); });
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') resetPointers(); });
  mount(kind);
  return {
    setKind(k) { mount(k); },
    setStage(s) { stage = s; pet.dataset.stage = s; },
    setFace(f) { applyFace(f); },
    setRoom(r) { baseRoom = r || null; if (playing) return; if (baseRoom) container.dataset.room = baseRoom; else container.removeAttribute('data-room'); },
    setPose(p) { pose = p || null; if (!playing) applyBase(); },
    setGloom(g) { container.dataset.gloom = String(g); },
    play, stop,
    isPlaying: () => playing,
    onGesture(cb) { gestureCb = cb; },
  };
}
