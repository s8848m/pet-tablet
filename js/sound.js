// Web Audio로 만드는 짧은 전자음. 첫 터치 전엔 브라우저가 소리를 막으므로 첫 play()에서 resume한다.
const RECIPES = {
  tap:     [[660, 0.06, 'square']],
  pop:     [[880, 0.05, 'sine'], [1320, 0.05, 'sine']],
  check:   [[523, 0.08, 'triangle'], [784, 0.12, 'triangle']],
  star:    [[1047, 0.07, 'sine'], [1319, 0.07, 'sine'], [1568, 0.14, 'sine']],
  eat:     [[220, 0.08, 'sawtooth'], [180, 0.08, 'sawtooth'], [220, 0.08, 'sawtooth']],
  splash:  [[400, 0.05, 'sine'], [300, 0.08, 'sine'], [500, 0.12, 'sine']],
  yawn:    [[330, 0.25, 'sine'], [247, 0.3, 'sine']],
  sad:     [[392, 0.15, 'triangle'], [330, 0.25, 'triangle']],
  fanfare: [[523, 0.1, 'square'], [659, 0.1, 'square'], [784, 0.1, 'square'], [1047, 0.3, 'square']],
};

export function createSound() {
  let ctx = null, enabled = true;
  function ensure() { if (!ctx) { const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (AC) ctx = new AC(); } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
  return {
    setEnabled(v) { enabled = !!v; },
    play(name) {
      const r = RECIPES[name]; if (!enabled || !r) return;
      const ac = ensure(); if (!ac) return;
      let t = ac.currentTime;
      for (const [freq, dur, type] of r) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
        t += dur;
      }
    },
  };
}
