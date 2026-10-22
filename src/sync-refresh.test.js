import test from 'node:test';
import assert from 'node:assert/strict';
import { startSyncRefresh } from './sync-refresh.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
const targets = () => ({ windowTarget: new EventTarget(), documentTarget: Object.assign(new EventTarget(), { hidden: false }), intervalMs: 60000 });

test('recovers after a failed first connection when the phone comes online', async () => {
  const options = targets();
  let attempts = 0;
  let errors = 0;
  const stop = startSyncRefresh(async () => {
    if (++attempts === 1) throw new Error('Offline');
  }, () => errors++, options);
  try {
    await settle();
    assert.equal(errors, 1);
    options.windowTarget.dispatchEvent(new Event('online'));
    await settle();
    assert.equal(attempts, 2);
  } finally { stop(); }
});

test('resumes on iPhone visibility and pageshow events, skips hidden checks and cleans up', async () => {
  const options = targets();
  let checks = 0;
  const stop = startSyncRefresh(async () => checks++, assert.fail, options);
  await settle();
  options.documentTarget.hidden = true;
  options.documentTarget.dispatchEvent(new Event('visibilitychange'));
  await settle();
  assert.equal(checks, 1);
  options.documentTarget.hidden = false;
  options.documentTarget.dispatchEvent(new Event('visibilitychange'));
  await settle();
  options.windowTarget.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.equal(checks, 3);
  stop();
  options.windowTarget.dispatchEvent(new Event('focus'));
  await settle();
  assert.equal(checks, 3);
});

test('resume events do not start overlapping downloads', async () => {
  const options = targets();
  let release;
  let checks = 0;
  const stop = startSyncRefresh(() => {
    checks++;
    return new Promise(resolve => { release = resolve; });
  }, assert.fail, options);
  try {
    options.windowTarget.dispatchEvent(new Event('focus'));
    options.windowTarget.dispatchEvent(new Event('pageshow'));
    assert.equal(checks, 1);
    release();
    await settle();
  } finally { stop(); }
});
