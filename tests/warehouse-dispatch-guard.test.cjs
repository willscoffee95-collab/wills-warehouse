'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function segment(startText, endText) {
  const start = app.indexOf(startText);
  const end = app.indexOf(endText, start + startText.length);
  assert.ok(start >= 0 && end > start, 'source segment exists: ' + startText);
  return app.slice(start, end);
}

const statusSource = segment(
  '  const WW_DISPATCH_CONFIRMED_STATES_V160=',
  '\n  // V1.5.2.7: Recovery'
);
const writeSource = segment(
  '  async function writeDeliveryDirect(',
  '\n  async function callDirect('
);

function statusHarness() {
  const calls = { updated: 0, cleared: 0, rendered: 0 };
  const ctx = {
    upsertFreshDeliveryV1354: () => { calls.updated++; },
    dispatchClearPendingV44: () => { calls.cleared++; },
    dispatchUpdateIfVisibleV44: () => { calls.rendered++; }
  };
  const { dispatchApplyStatusV44, WW_DISPATCH_CONFIRMED_STATES_V160 } =
    vm.runInNewContext(
      statusSource + '\n({dispatchApplyStatusV44, WW_DISPATCH_CONFIRMED_STATES_V160})', ctx
    );
  return { dispatchApplyStatusV44, statuses: WW_DISPATCH_CONFIRMED_STATES_V160, calls };
}

test('never release dispatch guard for missing, draft, unknown or canceled status', () => {
  const h = statusHarness();
  for (const status of [undefined, null, '', 'DRAFT', 'UNKNOWN', 'PENDING', 'DIBATALKAN', 'ERROR']) {
    assert.equal(h.dispatchApplyStatusV44('SJID-X', {sjId:'SJID-X',status}), false);
  }
  assert.equal(h.calls.cleared, 0);
  assert.equal(h.calls.updated, 0);
  assert.equal(h.calls.rendered, 0);
});

test('a status for another SJ never releases this dispatch guard', () => {
  const h = statusHarness();
  assert.equal(h.dispatchApplyStatusV44('SJID-X', {sjId:'SJID-Y',status:'DIKIRIM'}), false);
  assert.equal(h.calls.cleared, 0);
});

test('only recognized post-dispatch statuses release the pending guard', () => {
  const h = statusHarness();
  const confirmed = ['DIKIRIM','DITERIMA','DITERIMA_SEBAGIAN','SELISIH','SELESAI'];
  assert.deepEqual(Array.from(h.statuses), confirmed);
  for (const status of confirmed) {
    assert.equal(h.dispatchApplyStatusV44('SJID-X', {sjId:'SJID-X',status}), true);
  }
  assert.equal(h.calls.updated, confirmed.length);
  assert.equal(h.calls.cleared, confirmed.length);
  assert.equal(h.calls.rendered, confirmed.length);
});

function writeHarness({ backendCall, alreadyPending = false, instantTimeout = false }) {
  const stats = { requests: 0, pending: alreadyPending, locks: 0, unlocks: 0, toasts: [] };
  const inFlight = new Set();
  const ctx = {
    opsWriteInFlightV43: inFlight,
    dispatchPendingV44: () => stats.pending,
    dispatchStorePendingV44: () => { stats.pending = true; stats.locks++; },
    dispatchUpdateIfVisibleV44: () => {},
    idemKey: () => 'idem-unchanged-for-sj',
    currentSheetKey: () => 'delivery-detail:SJID-X',
    beginBusy: () => {},
    endBusy: () => {},
    bridge: {
      call: (...args) => {
        stats.requests++;
        return backendCall(...args);
      }
    },
    state: { token: 'session-test' },
    setTimeout: instantTimeout ? (cb) => { queueMicrotask(cb); return 1; } : setTimeout,
    clearTimeout: instantTimeout ? () => {} : clearTimeout,
    toast: (...args) => { stats.toasts.push(args); },
    dispatchAcceptResponseV44: (id, value) => {
      const status = String(value && value.deliveryV1354 && value.deliveryV1354.status || '');
      if (value && value.ok === true && ['DIKIRIM','DITERIMA','SELESAI'].includes(status)) {
        stats.pending = false;
        stats.unlocks++;
      }
    },
    localStorage: { removeItem: () => {} },
    reloadDeliveryModule: async () => ({}),
    sheetHistoryDepth: 0,
    closeSheet: () => {},
    dispatchUpdateIfVisibleV44: () => {}
  };
  const writeDeliveryDirect = vm.runInNewContext(
    writeSource + '\nwriteDeliveryDirect', ctx
  );
  const send = () => writeDeliveryDirect('dispatch_SJID-X', 'dispatchDelivery', { sjId: 'SJID-X' }, 'SJID-X');
  return { send, stats, inFlight };
}

test('blocked local pending attempt never invokes backend a second time', async () => {
  const h = writeHarness({ alreadyPending: true, backendCall: async () => ({ok:true}) });
  const result = await h.send();
  assert.equal(result.pending, true);
  assert.equal(h.stats.requests, 0);
});

test('double click during an in-flight dispatch invokes backend only once', async () => {
  let resolveBackend;
  const backend = new Promise(resolve => { resolveBackend = resolve; });
  const h = writeHarness({ backendCall: () => backend });
  const first = h.send();
  const second = await h.send();
  assert.equal(second, null);
  assert.equal(h.stats.requests, 1);
  resolveBackend({ ok: true, deliveryV1354: { sjId: 'SJID-X', status:'DIKIRIM' } });
  const result = await first;
  assert.equal(result.ok, true);
  assert.equal(h.stats.requests, 1);
  assert.equal(h.stats.pending, false);
  assert.equal(h.inFlight.size, 0);
});

test('backend error preserves pending guard and prevents blind retry', async () => {
  const h = writeHarness({ backendCall: async () => { throw new Error('network disconnected'); } });
  const result = await h.send();
  assert.equal(result.pending, true);
  assert.equal(h.stats.pending, true);
  await h.send();
  assert.equal(h.stats.requests, 1);
});

test('slow unresolved backend preserves pending guard and prevents blind retry', async () => {
  const h = writeHarness({ backendCall: () => new Promise(() => {}), instantTimeout: true });
  const result = await h.send();
  assert.equal(result.pending, true);
  assert.equal(h.stats.pending, true);
  await h.send();
  assert.equal(h.stats.requests, 1);
});
