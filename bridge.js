(() => {
  'use strict';

  const config = window.WILLS_CONFIG || {};
  const pending = new Map();
  let iframe = null;
  let bridgeWindow = null;
  let bridgeOrigin = '';
  let readyPromise = null;
  let readyResolve = null;
  let readyReject = null;
  let readyTimer = null;

  function validWebAppUrl(url) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(String(url || '').trim());
  }

  function isTrustedGoogleOrigin(origin) {
    return origin === 'https://script.google.com' || /^https:\/\/[A-Za-z0-9.-]+\.googleusercontent\.com$/.test(origin);
  }

  function makeRequestId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function onMessage(event) {
    const msg = event.data || {};

    if (msg.type === 'WW_BRIDGE_READY') {
      if (!readyResolve || !iframe || !isTrustedGoogleOrigin(event.origin) || !event.source) return;
      // Accept only the first READY for the active bridge initialization. A later
      // READY cannot replace the bridgeWindow and hijack subsequent method calls.
      // Apps Script may use a nested sandbox, so source need not equal iframe.contentWindow.
      bridgeWindow = event.source;
      bridgeOrigin = event.origin;
      if (readyTimer !== null) { clearTimeout(readyTimer); readyTimer = null; }
      const resolve = readyResolve;
      readyResolve = null;
      readyReject = null;
      resolve({ origin: bridgeOrigin, version: msg.bridgeVersion || '' });
      return;
    }

    if (msg.type !== 'WW_BRIDGE_RESPONSE') return;
    if (!bridgeWindow || event.source !== bridgeWindow) return;
    if (!bridgeOrigin || event.origin !== bridgeOrigin) return;
    const slot = pending.get(String(msg.requestId || ''));
    if (!slot) return;
    pending.delete(String(msg.requestId));
    clearTimeout(slot.timer);
    if (msg.ok) slot.resolve(msg.value);
    else slot.reject(new Error(msg.error || 'Backend error'));
  }

  window.addEventListener('message', onMessage);

  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });

    const url = String(config.APPS_SCRIPT_URL || '').trim();
    if (!validWebAppUrl(url)) {
      readyReject(new Error('URL Apps Script belum diisi di config.js.'));
      return readyPromise;
    }

    iframe = document.createElement('iframe');
    iframe.id = 'wwBackendBridge';
    iframe.title = 'Wills Warehouse Backend Bridge';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none;';
    const sep = url.includes('?') ? '&' : '?';
    iframe.src = url + sep + 'view=bridge&v=4.1.0';
    document.body.appendChild(iframe);

    readyTimer = setTimeout(() => {
      readyTimer = null;
      if (bridgeWindow || !readyReject) return;
      const reject = readyReject;
      readyResolve = null;
      readyReject = null;
      readyPromise = null; // next explicit user operation can try reconnecting
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframe = null;
      reject(new Error('Bridge Apps Script tidak merespons. Coba ulangi setelah koneksi stabil; jangan mengulang transaksi yang statusnya belum pasti.'));
    }, 15000);

    return readyPromise;
  }

  async function call(method, ...args) {
    await init();
    if (!bridgeWindow || !bridgeOrigin) throw new Error('Bridge belum siap.');
    const requestId = makeRequestId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('Backend belum selesai setelah 3 menit. Jangan ulangi transaksi stok sebelum memeriksa Riwayat; untuk sinkron, coba per SJ.'));
      }, 180000);
      pending.set(requestId, { resolve, reject, timer });
      try {
        bridgeWindow.postMessage({
          type: 'WW_BRIDGE_CALL',
          requestId,
          method,
          args
        }, bridgeOrigin);
      } catch (error) {
        pending.delete(requestId);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  window.WILLS_BRIDGE = Object.freeze({ init, call, validWebAppUrl });
})();
