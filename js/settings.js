import { addTask, updateTask, removeTask, moveTask, setGoal, clearGoal, TASK_ICONS } from './state.js';
import { ICON, escapeHtml } from './ui.js';
import { createPetView } from './pet-view.js';

const SLOTS = [['morning', '아침'], ['day', '낮'], ['evening', '저녁'], ['any', '아무 때나']];

export function mountSettings(ui, getState, setState, { storage, sound, behaviors, onClose }) {
  const root = ui.settingsRoot;

  let testView = null; // 행동 시험 전용 두 번째 펫 뷰

  function draw() {
    if (testView) testView.stop();
    const s = getState();
    root.innerHTML = `
      <header class="set-head"><h1>아빠 설정</h1><button id="set-close" class="big">닫기</button></header>
      <div class="set-body">
        <section><h2>할 일</h2>
          <ul id="set-tasks">${s.tasks.map((t, i) => `
            <li data-id="${t.id}">
              <select data-f="icon">${TASK_ICONS.map((ic) => `<option value="${ic}" ${ic === t.icon ? 'selected' : ''}>${ICON[ic]}</option>`).join('')}</select>
              <input data-f="name" value="${escapeHtml(t.name)}" maxlength="10">
              <select data-f="slot">${SLOTS.map(([v, l]) => `<option value="${v}" ${v === t.slot ? 'selected' : ''}>${l}</option>`).join('')}</select>
              <button data-a="up" ${i === 0 ? 'disabled' : ''}>▲</button><button data-a="down" ${i === s.tasks.length - 1 ? 'disabled' : ''}>▼</button><button data-a="del">삭제</button>
            </li>`).join('')}</ul>
          <button id="set-add">+ 할 일 추가</button>
        </section>
        <section><h2>숫자</h2>
          <label>하루 초기화 시각 <input id="set-reset" type="number" min="0" max="23" value="${s.settings.resetHour}">시</label>
          <label>어린이가 되는 별 <input id="set-child" type="number" min="1" value="${s.settings.childStars}"></label>
          <label>어른이 되는 별 <input id="set-adult" type="number" min="2" value="${s.settings.adultStars}"></label>
          <button id="set-num-save">저장</button>
        </section>
        <section><h2>목표 보상</h2>
          <p>${s.goal ? `지금 목표: ⭐${s.goal.stars} → ${escapeHtml(s.goal.text)} ${s.goal.reachedAt ? '(달성!)' : ''}` : '목표 없음'}</p>
          <label>보상 문구 <input id="set-goal-text" maxlength="20" placeholder="예: 아이스크림"></label>
          <label>필요한 별 <input id="set-goal-stars" type="number" min="1" placeholder="${s.stars + 10}"></label>
          <button id="goal-save">새 목표 정하기</button> <button id="goal-clear">목표 지우기</button>
        </section>
        <section><h2>비밀번호</h2>
          <label>새 비밀번호 4자리 <input id="pin-new" type="password" inputmode="numeric" maxlength="4"></label><button id="pin-save">바꾸기</button>
          <p class="hint">비밀번호를 잊으면 되찾을 방법이 없습니다. 그때는 "처음부터 다시"만 가능합니다.</p>
        </section>
        <section><h2>백업</h2>
          <button id="bk-export">백업 파일 저장</button>
          <label class="file">백업 불러오기 <input id="bk-import" type="file" accept=".json,application/json"></label>
          <p class="hint">저장하면 내려받기 폴더에 pet-backup-날짜.json 파일이 생깁니다.</p>
        </section>
        <section><h2>행동 시험</h2>
          <select id="bt-sel">${Object.values(behaviors).map((b) => `<option value="${b.id}">${b.id} ${b.name}</option>`).join('')}</select>
          <button id="bt-play">재생</button>
          <div id="bt-stage" class="bt-stage"></div>
        </section>
        <section><h2>처음부터 다시</h2><button id="set-reset-all" class="danger">모든 기록 지우기</button></section>
      </div>`;
    bind();
  }

  function bind() {
    const s = () => getState();
    root.querySelector('#set-close').onclick = () => onClose();
    root.querySelector('#set-tasks').addEventListener('change', (e) => {
      const li = e.target.closest('li'); const f = e.target.dataset.f; if (!li || !f) return;
      setState(updateTask(s(), li.dataset.id, { [f]: e.target.value.trim() || '할 일' }));
    });
    root.querySelector('#set-tasks').addEventListener('click', async (e) => {
      const li = e.target.closest('li'); const a = e.target.dataset.a; if (!li || !a) return;
      if (a === 'up') setState(moveTask(s(), li.dataset.id, -1));
      if (a === 'down') setState(moveTask(s(), li.dataset.id, 1));
      if (a === 'del' && (await ui.confirm('이 할 일을 지울까요?'))) setState(removeTask(s(), li.dataset.id));
      draw();
    });
    root.querySelector('#set-add').onclick = () => { setState(addTask(s(), { name: '새 할 일', icon: 'star', slot: 'any' })); draw(); };
    root.querySelector('#set-num-save').onclick = () => {
      const v = (id, lo, hi) => Math.min(hi, Math.max(lo, Number(root.querySelector(id).value) || lo));
      const childStars = v('#set-child', 1, 9999), adultStars = Math.max(childStars + 1, v('#set-adult', 2, 9999));
      setState({ ...s(), settings: { ...s().settings, resetHour: v('#set-reset', 0, 23), childStars, adultStars } });
      ui.toast('저장했어요'); draw();
    };
    root.querySelector('#goal-save').onclick = () => {
      const text = root.querySelector('#set-goal-text').value.trim(), stars = Number(root.querySelector('#set-goal-stars').value);
      if (!text || !(stars > 0)) { ui.toast('문구와 별 개수를 적어 주세요'); return; }
      setState(setGoal(s(), { text, stars })); draw();
    };
    root.querySelector('#goal-clear').onclick = () => { setState(clearGoal(s())); draw(); };
    root.querySelector('#pin-save').onclick = () => {
      const pin = root.querySelector('#pin-new').value;
      if (!/^\d{4}$/.test(pin)) { ui.toast('숫자 4자리여야 해요'); return; }
      setState({ ...s(), settings: { ...s().settings, pin } }); ui.toast('비밀번호를 바꿨어요'); draw();
    };
    root.querySelector('#bk-export').onclick = () => {
      const blob = new Blob([storage.exportText(s())], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `pet-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    root.querySelector('#bk-import').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (!(await ui.confirm('지금 기록을 백업 파일로 덮어쓸까요?'))) return;
      const text = await file.text();
      const imported = storage.importText(text);
      if (!imported) { ui.toast('백업 파일이 아니에요'); return; }
      setState(imported); ui.toast('불러왔어요'); draw();
    };
    testView = createPetView(root.querySelector('#bt-stage'), { kind: s().pet.kind });
    testView.setStage(s().growth.stage);
    root.querySelector('#bt-play').onclick = () => {
      const b = behaviors[Number(root.querySelector('#bt-sel').value)];
      if (!b) return;
      if (b.sound) sound.play(b.sound);
      testView.play(b);
    };
    root.querySelector('#set-reset-all').onclick = async () => {
      if (!(await ui.confirm('정말 모든 기록을 지울까요?'))) return;
      if (!(await ui.confirm('펫과 별이 전부 사라져요. 정말요?'))) return;
      storage.clear(); location.reload();
    };
  }

  // 설정 화면이 열릴 때마다 다시 그린다 (main.js가 showScreen('settings') 전에 호출하지 않아도 되도록 감시)
  new MutationObserver(() => { if (!root.hidden) draw(); else if (testView) testView.stop(); }).observe(root, { attributes: true, attributeFilter: ['hidden'] });
}
