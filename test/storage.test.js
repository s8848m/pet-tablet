import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, migrate, STORAGE_KEY } from '../js/storage.js';
import { createInitialState, CURRENT_VERSION } from '../js/state.js';

const fakeLS = () => { const m = new Map(); return {
  getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
const T0 = 1_800_000_000_000;
const base = () => createInitialState({ kind: 'coco', name: 'x', pin: '1111' }, T0);

test('save then load round-trips', () => {
  const ls = fakeLS(); const st = createStorage(ls);
  st.save(base());
  assert.ok(ls._m.has(STORAGE_KEY));
  assert.deepEqual(st.load(), base());
});

test('load: empty / corrupt / non-object → null, never throws', () => {
  const ls = fakeLS(); const st = createStorage(ls);
  assert.equal(st.load(), null);
  ls.setItem(STORAGE_KEY, '{not json'); assert.equal(st.load(), null);
  ls.setItem(STORAGE_KEY, '42'); assert.equal(st.load(), null);
  ls.setItem(STORAGE_KEY, '{"version":1}'); assert.equal(st.load(), null);
});

test('migrate fills missing fields from defaults and bumps version', () => {
  const old = { pet: { kind: 'mochi', name: '옛날', hatchedAt: T0 }, stats: { hunger: 10 }, settings: { pin: '9999' } };
  const s = migrate(old);
  assert.equal(s.version, CURRENT_VERSION);
  assert.equal(s.stats.hunger, 10); assert.equal(s.stats.fun, 100);
  assert.equal(s.settings.pin, '9999'); assert.equal(s.settings.resetHour, 4);
  assert.equal(s.growth.stage, 'baby'); assert.equal(s.tasks.length, 5);
  assert.equal(s.gloom, 0); assert.equal(s.goal, null);
  assert.equal(typeof s.today.key, 'string');
});

test('export/import round-trip; bad text → null and existing save untouched', () => {
  const ls = fakeLS(); const st = createStorage(ls);
  st.save(base());
  const text = st.exportText(base());
  assert.equal(JSON.parse(text).pet.name, 'x');
  const changed = { ...base(), stars: 7 };
  const imported = st.importText(JSON.stringify(changed));
  assert.equal(imported.stars, 7); assert.equal(st.load().stars, 7);
  assert.equal(st.importText('garbage'), null); assert.equal(st.load().stars, 7);
  assert.equal(st.importText('{"a":1}'), null);
});

test('clear removes the key', () => {
  const ls = fakeLS(); const st = createStorage(ls);
  st.save(base()); st.clear(); assert.equal(st.load(), null);
});
