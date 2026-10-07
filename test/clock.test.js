import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clock } from '../js/clock.js';

test('clock.now returns a number and can be overridden', () => {
  assert.equal(typeof clock.now(), 'number');
  const saved = clock.now;
  clock.now = () => 1234;
  assert.equal(clock.now(), 1234);
  clock.now = saved;
});
