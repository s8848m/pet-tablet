import { createInitialState, CURRENT_VERSION } from './state.js';

export const STORAGE_KEY = 'pet-tablet';

export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !raw.pet || typeof raw.pet !== 'object') return null;
  const def = createInitialState({ kind: raw.pet.kind || 'mochi', name: raw.pet.name || '', pin: '0000' }, raw.pet.hatchedAt || Date.now());
  const s = { ...def, ...raw };
  s.pet = { ...def.pet, ...raw.pet };
  s.stats = { ...def.stats, ...(raw.stats || {}) };
  s.settings = { ...def.settings, ...(raw.settings || {}) };
  s.growth = { ...def.growth, ...(raw.growth || {}) };
  s.today = { ...def.today, ...(raw.today || {}) };
  if (!Array.isArray(s.tasks)) s.tasks = def.tasks;
  if (s.goal !== null && (typeof s.goal !== 'object' || !s.goal)) s.goal = null;
  s.version = CURRENT_VERSION;
  return s;
}

export function createStorage(backend = globalThis.localStorage) {
  const readRaw = () => { try { const t = backend.getItem(STORAGE_KEY); return t ? JSON.parse(t) : null; } catch { return null; } };
  return {
    load() { return migrate(readRaw()); },
    save(state) { try { backend.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); } },
    clear() { try { backend.removeItem(STORAGE_KEY); } catch {} },
    exportText(state) { return JSON.stringify(state, null, 2); },
    importText(text) {
      let parsed; try { parsed = JSON.parse(text); } catch { return null; }
      const s = migrate(parsed); if (!s) return null;
      this.save(s); return s;
    },
  };
}
