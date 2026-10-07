import { createUI } from './ui.js';
import { createInitialState } from './state.js';
import { createPetView } from './pet-view.js';
const ui = createUI({ onCare: console.log, onTaskTap: console.log, onNameLongPress: console.log, onSoundToggle: console.log, onHatch: console.log });
const s = createInitialState({ kind: 'mochi', name: '모찌', pin: '0000' }, Date.now());
ui.showScreen('main'); ui.render(s, Date.now());
createPetView(ui.petContainer, { kind: 'mochi' });

window.ui = ui;
