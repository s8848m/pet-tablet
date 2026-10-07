// 행동 하나 = 부위 프리셋 + 표정 + 소품 + 효과 + 말풍선 + 이동 + 조건. 새 행동은 여기 한 줄 추가.
const B = (id, name, group, dur, rest = {}) => ({ id, name, group, dur, ...rest });
const low = (k, n) => (c) => c.stats[k] < n;

const list = [
  // A. 혼자 있을 때 (idle, 20)
  B(1, '눈 깜빡', 'idle', 900, { face: 'closed', anim: { all: 'bob' } }),
  B(2, '두리번', 'idle', 1800, { anim: { head: 'lookAround' } }),
  B(3, '하품', 'idle', 1600, { face: 'sleepy', anim: { armR: 'cover' }, bubble: '하암' }),
  B(4, '기지개', 'idle', 1800, { anim: { all: 'stretch', arms: 'raise' } }),
  B(5, '좌우로 걷기', 'idle', 3000, { anim: { all: 'walk', legs: 'walk' }, move: { x: 100 } }),
  B(6, '폴짝 뛰기', 'idle', 1200, { face: 'happy', anim: { all: 'hop' } }),
  B(7, '제자리 빙글', 'idle', 1400, { anim: { all: 'spin' } }),
  B(8, '바닥에 앉기', 'idle', 2500, { anim: { all: 'sit' } }),
  B(9, '공 굴리기', 'idle', 2600, { anim: { all: 'sit', armR: 'point' }, prop: { id: 'ball', slot: 'floor' } }),
  B(10, '깜빡 졸기', 'idle', 2400, { face: 'sleepy', anim: { head: 'nod' }, fx: 'zzz' }),
  B(11, '창밖 보기', 'idle', 2800, { anim: { all: 'walk', head: 'lookUp' }, move: { x: -120 } }),
  B(12, '손 흔들기', 'idle', 1600, { face: 'happy', anim: { armR: 'wave' } }),
  B(13, '콧노래', 'idle', 2600, { face: 'sing', anim: { all: 'wobble' }, fx: 'notes' }),
  B(14, '꼬리 흔들기', 'idle', 1600, { face: 'happy', anim: { tail: 'wag' } }),
  B(15, '바닥에 그림 그리기', 'idle', 3000, { anim: { all: 'sit', armR: 'scribble' }, prop: { id: 'crayon', slot: 'handR' } }),
  B(16, '인형 껴안기', 'idle', 2600, { face: 'shy', anim: { arms: 'hold' }, prop: { id: 'doll', slot: 'front' }, fx: 'hearts' }),
  B(17, '거울 보고 포즈', 'idle', 2600, { face: 'smug', anim: { all: 'lean', armL: 'raise' }, prop: { id: 'mirror', slot: 'handL' }, fx: 'sparkle' }),
  B(18, '비눗방울 불기', 'idle', 2800, { anim: { armR: 'hold' }, prop: { id: 'wand', slot: 'handR' }, fx: 'bubbles' }),
  B(19, '숨었다 까꿍', 'idle', 2600, { face: 'laugh', anim: { all: 'peek' }, bubble: '까꿍!' }),
  B(20, '화면 톡톡', 'idle', 1800, { face: 'surprised', anim: { all: 'tapGlass', armR: 'point' }, fx: 'question' }),

  // B. 상태가 나쁠 때 (need, 10)
  B(21, '배 문지르기', 'need', 2000, { face: 'sad', anim: { armR: 'rub' }, when: (c) => c.stats.hunger < 40 && c.stats.hunger >= 20 }),
  B(22, '빈 그릇 쳐다보기', 'need', 2600, { face: 'cry', anim: { arms: 'hold', head: 'bow' }, prop: { id: 'bowlEmpty', slot: 'front' }, when: low('hunger', 20) }),
  B(23, '몸 긁기', 'need', 1800, { face: 'grumpy', anim: { armL: 'scratch' }, when: (c) => c.stats.clean < 40 && c.stats.clean >= 20 }),
  B(24, '파리 날아다님', 'need', 2800, { face: 'grumpy', anim: { head: 'lookAround', armR: 'wave' }, fx: 'flies', when: low('clean', 20) }),
  B(25, '꾸벅꾸벅', 'need', 2400, { face: 'sleepy', anim: { head: 'nodFast' }, fx: 'zzz', when: low('energy', 30) }),
  B(26, '바닥에 뒹굴', 'need', 2800, { face: 'grumpy', anim: { all: 'roll' }, when: (c) => c.stats.fun < 40 && c.stats.fun >= 20 }),
  B(27, '한숨', 'need', 2000, { face: 'sad', anim: { all: 'squash', head: 'bow' }, bubble: '휴…', when: low('fun', 20) }),
  B(28, '구석에 쪼그리기', 'need', 3500, { face: 'sad', anim: { all: 'crouch', legs: 'curl' }, move: { x: -130 }, when: (c) => c.gloom > 0, weight: 3 }),
  B(29, '비 구름', 'need', 2600, { face: 'cry', anim: { all: 'tremble' }, fx: 'rain', when: (c) => c.mood === 'sad' }),
  B(30, '달려와 안김', 'event', 2600, { face: 'laugh', anim: { all: 'run', arms: 'raise' }, move: { x: 0 }, fx: 'hearts', sound: 'fanfare' }),

  // C. 터치 반응 (touch, 10)
  B(31, '머리 쓰다듬', 'touch', 1400, { face: 'closed', anim: { head: 'tilt' }, fx: 'hearts', sound: 'pop' }),
  B(32, '배 쿡', 'touch', 1200, { face: 'laugh', anim: { all: 'squash' }, fx: 'tickle', sound: 'pop' }),
  B(33, '발 터치', 'touch', 900, { face: 'surprised', anim: { legs: 'kick', all: 'shrink' } }),
  B(34, '꼬리 터치', 'touch', 1100, { face: 'surprised', anim: { all: 'spin', tail: 'wag' }, fx: 'question' }),
  B(35, '빠른 연타', 'touch', 1800, { face: 'dizzy', anim: { all: 'dizzy' }, fx: 'stars' }),
  B(36, '길게 누르기', 'touch', 1600, { face: 'shy', anim: { arms: 'raise', all: 'lean' }, fx: 'hearts' }),
  B(37, '들려서 따라옴', 'touch', 600, { face: 'surprised', anim: { legs: 'curl', all: 'float' } }),
  B(38, '통통 착지', 'touch', 1000, { face: 'happy', anim: { all: 'bounceLand' }, fx: 'dust', sound: 'tap' }),
  B(39, '간지럼 폭소', 'touch', 1800, { face: 'laugh', anim: { all: 'wobble', arms: 'cover' }, fx: 'tickle', sound: 'pop' }),
  B(40, '배경 쳐다봄', 'touch', 1000, { anim: { head: 'lookL' } }),

  // D. 돌봄 (feed 5 / play 6 / wash 4 / sleep 5)
  B(41, '허겁지겁', 'feed', 2600, { face: 'happy', anim: { head: 'nodFast', arms: 'hold' }, prop: { id: 'bowl', slot: 'front' }, fx: 'crumbs', sound: 'eat', when: (c) => c.result === 'ate' }),
  B(42, '냄새 맡고 천천히', 'feed', 3200, { face: 'normal', anim: { head: 'sniff', arms: 'hold' }, prop: { id: 'bowl', slot: 'front' }, sound: 'eat', when: (c) => c.result === 'ate' }),
  B(43, '배불러서 거절', 'feed', 1800, { face: 'full', anim: { head: 'shakeHead', armR: 'raise' }, prop: { id: 'bowl', slot: 'front' }, bubble: '배불러', sound: 'sad', when: (c) => c.result === 'refused' }),
  B(44, '트림', 'feed', 2400, { face: 'full', anim: { all: 'squash' }, prop: { id: 'bowl', slot: 'floor' }, bubble: '꺼억', sound: 'eat', when: (c) => c.result === 'ate' }),
  B(45, '그릇 핥기', 'feed', 2600, { face: 'happy', anim: { head: 'bow', arms: 'hold' }, prop: { id: 'bowl', slot: 'front' }, fx: 'sparkle', sound: 'eat', when: (c) => c.result === 'ate' }),
  B(46, '공 주고받기', 'play', 3000, { face: 'happy', anim: { all: 'hop3', armR: 'raise' }, prop: { id: 'ball', slot: 'above' }, sound: 'tap', when: (c) => c.result === 'played' }),
  B(47, '숨바꼭질', 'play', 3200, { face: 'laugh', anim: { all: 'hide' }, bubble: '여기!', sound: 'pop', when: (c) => c.result === 'played' }),
  B(48, '춤추기', 'play', 3000, { face: 'sing', anim: { all: 'dance', arms: 'raise' }, fx: 'notes', sound: 'tap', when: (c) => c.result === 'played' }),
  B(49, '줄넘기', 'play', 3000, { face: 'happy', anim: { all: 'jumpRope' }, prop: { id: 'rope', slot: 'front' }, sound: 'tap', when: (c) => c.result === 'played' }),
  B(50, '풍선 쫓기', 'play', 3200, { face: 'happy', anim: { all: 'run', arms: 'raise' }, prop: { id: 'balloon', slot: 'above' }, move: { x: 110 }, when: (c) => c.result === 'played' }),
  B(51, '블록 쌓다 무너뜨리기', 'play', 3200, { face: 'surprised', anim: { all: 'sit', armR: 'hold' }, prop: { id: 'blocks', slot: 'floor' }, fx: 'dust', sound: 'pop', when: (c) => c.result === 'played' }),
  B(52, '거품 목욕', 'wash', 3200, { face: 'happy', anim: { all: 'bob', head: 'shakeHead' }, room: 'bath', fx: 'bubbles', sound: 'splash', when: (c) => c.result === 'washed' }),
  B(53, '물 싫어 도망', 'wash', 3400, { face: 'surprised', anim: { all: 'run' }, move: { x: 120 }, room: 'bath', fx: 'drops', sound: 'splash', when: (c) => c.result === 'washed' }),
  B(54, '오리 인형 목욕', 'wash', 3200, { face: 'laugh', anim: { all: 'bob', armR: 'hold' }, prop: { id: 'duck', slot: 'handR' }, room: 'bath', fx: 'bubbles', sound: 'splash', when: (c) => c.result === 'washed' }),
  B(55, '수건 두르고 반짝', 'wash', 2000, { face: 'smug', anim: { all: 'lean' }, prop: { id: 'towel', slot: 'head' }, fx: 'sparkle', bubble: '깨끗해!', when: (c) => c.result === 'already_clean' }),
  B(56, '이불 덮고 코 골기', 'sleep', 2600, { face: 'sleep', anim: { all: 'lie' }, prop: { id: 'blanket', slot: 'front' }, room: 'dark', fx: 'zzz', sound: 'yawn', when: (c) => c.result === 'slept' }),
  B(57, '꿈 말풍선', 'asleepIdle', 3000, { face: 'sleep', anim: { all: 'lie' }, prop: { id: 'blanket', slot: 'front' }, fx: 'zzz', bubble: ['⭐','🍚','⚽'] }),
  B(58, '이불 차기', 'asleepIdle', 2400, { face: 'sleep', anim: { all: 'lie', legs: 'kick' }, prop: { id: 'blanketFloor', slot: 'floor' }, fx: 'zzz' }),
  B(59, '깨울 때 투덜', 'wake', 2000, { face: 'grumpy', anim: { all: 'sit', armR: 'rub' }, bubble: '으응…', sound: 'yawn' }),
  B(60, '스스로 눕기', 'autosleep', 3000, { face: 'sleepy', anim: { all: 'lie' }, prop: { id: 'blanket', slot: 'front' }, room: 'dark', fx: 'zzz', sound: 'yawn' }),

  // E. 할 일 (task 6 / event 6)
  B(61, '칫솔 양치', 'task', 2600, { face: 'happy', anim: { armR: 'brush' }, prop: { id: 'toothbrush', slot: 'handR' }, fx: 'bubbles', sound: 'check' }),
  B(62, '양치 후 잘 자', 'task', 2800, { face: 'closed', anim: { armR: 'brush', armL: 'wave' }, prop: { id: 'toothbrush', slot: 'handR' }, bubble: '잘 자', sound: 'check' }),
  B(63, '연필 끄적', 'task', 2600, { face: 'normal', anim: { all: 'sit', armR: 'scribble' }, prop: { id: 'pencil', slot: 'handR' }, sound: 'check' }),
  B(64, '책 펴고 끄덕', 'task', 2800, { face: 'normal', anim: { all: 'sit', head: 'nod', arms: 'hold' }, prop: { id: 'book', slot: 'front' }, sound: 'check' }),
  B(65, '장난감 상자에 넣기', 'task', 2800, { face: 'happy', anim: { all: 'lean', arms: 'hold' }, prop: { id: 'box', slot: 'floor' }, fx: 'sparkle', sound: 'check' }),
  B(66, '엄지 척', 'task', 1600, { face: 'proud', anim: { armR: 'thumb' }, sound: 'check' }),
  B(67, '눈 반짝', 'event', 1400, { face: 'happy', anim: { all: 'hop' }, fx: 'stars', sound: 'star' }),
  B(68, '메달', 'event', 2600, { face: 'proud', anim: { all: 'lean', arms: 'raise' }, prop: { id: 'medal', slot: 'front' }, fx: 'sparkle', sound: 'fanfare' }),
  B(69, '폭죽+춤+왕관', 'event', 3600, { face: 'laugh', anim: { all: 'dance', arms: 'raise' }, prop: { id: 'crown', slot: 'head' }, room: 'party', fx: 'confetti', sound: 'fanfare' }),
  B(70, '갸우뚱', 'event', 1200, { face: 'surprised', anim: { head: 'tilt' }, fx: 'question', sound: 'sad' }),
  B(71, '트로피', 'event', 3000, { face: 'proud', anim: { all: 'hop3', arms: 'raise' }, prop: { id: 'trophy', slot: 'front' }, fx: 'confetti', sound: 'fanfare' }),
  B(72, '선물 상자', 'event', 3200, { face: 'laugh', anim: { all: 'hop', arms: 'hold' }, prop: { id: 'gift', slot: 'front' }, fx: 'stars', sound: 'fanfare' }),
];

export const BEHAVIORS = Object.fromEntries(list.map((b) => [b.id, b]));
export const WAKE_ID = 59, AUTOSLEEP_ID = 60, RETURN_ID = 30, NEGLECT_ID = 28;

function weightedPick(pairs, rng) {
  if (pairs.length === 0) return null;
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [b, w] of pairs) { r -= w; if (r < 0) return b.id; }
  return pairs[pairs.length - 1][0].id;
}

export function pickIdle(ctx, rng = Math.random) {
  const idles = [];
  const needs = [];

  for (const b of list) {
    if (ctx.asleep) { if (b.group === 'asleepIdle') idles.push(b); continue; }
    if (b.group === 'idle') idles.push(b);
    else if (b.group === 'need' && b.when && b.when(ctx)) needs.push(b);
  }

  if (needs.length > 0) {
    const pool = [];
    const totalNeedWeight = needs.reduce((sum, b) => sum + (b.weight || 1), 0);

    // Idles: total weight 1 (uniform distribution)
    for (const b of idles) pool.push([b, 1 / idles.length]);

    // Needs: total weight 2, split by b.weight
    for (const b of needs) pool.push([b, 2 * (b.weight || 1) / totalNeedWeight]);

    return weightedPick(pool, rng);
  } else {
    // No needs: idle only
    return weightedPick(idles.map(b => [b, 1]), rng);
  }
}

export function pickCare(kind, ctx, rng = Math.random) {
  const pool = list.filter((b) => b.group === kind && (!b.when || b.when(ctx))).map((b) => [b, 1]);
  return weightedPick(pool, rng);
}

const TASK_BY_ICON = { brush: 61, pencil: 63, book: 64, box: 65 };
const EVENT_IDS = { first_today: 67, streak3: 68, all_done: 69, unchecked: 70, streak7: 71, goal_reached: 72 };
export function forTask(task, events) {
  const out = [];
  if (events.includes('checked')) {
    if (task.icon === 'brush') out.push(task.slot === 'evening' ? 62 : 61);
    else out.push(TASK_BY_ICON[task.icon] || 66);
  }
  for (const e of ['first_today', 'streak3', 'streak7', 'all_done', 'goal_reached', 'unchecked']) {
    if (events.includes(e)) out.push(EVENT_IDS[e]);
  }
  return out;
}

const TOUCH = { patHead: 31, pokeBelly: 32, touchFoot: 33, touchTail: 34, rapid: 35, long: 36, drag: 37, drop: 38, pinch: 39, background: 40 };
export function forTouch(gesture) { return TOUCH[gesture]; }
