(() => {
  'use strict';

  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const config = window.WILLS_CONFIG || { MODE: 'live-readonly' };
  const bridge = window.WILLS_BRIDGE;
  const TOKEN_KEY = 'ww_github_token_v1';

  const icons = {
    box: '<svg viewBox="0 0 24 24"><path d="m21 8-9 5-9-5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>',
    cart: '<svg viewBox="0 0 24 24"><path d="M3 3h2l2.3 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 6H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
    pack: '<svg viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/><path d="M8 5v4"/></svg>',
    truck: '<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    money: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M17 14h.01"/><circle cx="12" cy="12" r="2.2"/></svg>',
    expense: '<svg viewBox="0 0 24 24"><path d="M12 3v18M17 8l-5-5-5 5M7 16l5 5 5-5"/></svg>',
    audit: '<svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4"/><path d="M5 4h14v16H5z"/><path d="M8 4V2h8v2"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    price: '<svg viewBox="0 0 24 24"><path d="M20 13 11 22l-9-9V4h9z"/><circle cx="7" cy="9" r="1"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    wallet: '<svg viewBox="0 0 24 24"><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 11h5v4h-5a2 2 0 1 1 0-4"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>'
  };

  let state = {
    publicState: null,
    token: localStorage.getItem(TOKEN_KEY) || '',
    data: null,
    bridgeReady: false
  };
  let activePage = 'home';
  let stockFilter = 'Semua';

  const pages = {
    home: renderHome,
    stock: renderStock,
    transactions: renderTransactions,
    history: renderHistory,
    control: renderControl
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function num(v, max = 2) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: max }).format(Number(v || 0)); }
  function rp(v) { return 'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(v || 0)); }
  function compactRp(v) {
    const n = Number(v || 0), abs = Math.abs(n);
    if (abs >= 1e9) return 'Rp' + num(n / 1e9, 2) + ' M';
    if (abs >= 1e6) return 'Rp' + num(n / 1e6, 2) + ' jt';
    if (abs >= 1e3) return 'Rp' + num(n / 1e3, 1) + ' rb';
    return rp(n);
  }
  function greeting() {
    const h = new Date().getHours();
    return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function pageHead(title, subtitle, chip) {
    const liveChip = chip || (state.bridgeReady ? 'Live · Backend' : 'Bridge offline');
    return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><span class="sync-chip">${esc(liveChip)}</span></div>`;
  }

  function materialMap() {
    const out = {};
    (state.data && state.data.materials || []).forEach(m => { out[m.code] = m; });
    return out;
  }

  function liveStocks() {
    if (!state.data) return [];
    const mm = materialMap();
    return (state.data.stock || []).map(s => {
      const m = mm[s.code] || {};
      const factor = Number(m.factor || 1) || 1;
      const physicalQty = Number(s.qty || 0) / factor;
      let type = 'Gudang';
      if (m.type === 'RAW_BULK') type = 'Bulk';
      if (m.type === 'PACKED_OUTPUT') type = 'Packed';
      const statusRaw = String(s.status || '').toUpperCase();
      const status = statusRaw === 'MENIPIS' ? 'Menipis' : (statusRaw === 'KRITIS' || statusRaw === 'HABIS' ? 'Kritis' : 'Aman');
      return {
        code: s.code,
        name: s.name,
        qty: physicalQty,
        unit: m.receiveUnit || s.baseUnit || '',
        status,
        type,
        value: Number(s.value || 0),
        avgCost: Number(s.avgCost || 0) * factor
      };
    });
  }

  const TX_META = {
    PURCHASE: ['Belanja Bahan','cart'],
    PACKING_BATCH: ['Batch Packing','pack'],
    DISTRIBUTION_DISPATCH: ['Pengiriman Surat Jalan','truck'],
    OUTLET_RECEIVABLE: ['Piutang Outlet','money'],
    OUTLET_PAYMENT: ['Pembayaran Outlet','money'],
    OPERATIONAL_EXPENSE: ['Pengeluaran Operasional','expense'],
    SUPPLIER_PAYMENT: ['Bayar Supplier','wallet'],
    PACKING_WAGE_PAYMENT: ['Bayar Upah Packing','money'],
    STOCK_ADJUSTMENT: ['Opname / Koreksi','audit'],
    OPENING_STOCK: ['Saldo Awal Stok','box'],
    OPENING_BANK: ['Saldo Awal Bank','wallet'],
    OPENING_CASH: ['Saldo Awal Kas','wallet'],
    REVERSAL: ['Reversal Transaksi','audit']
  };

  function liveHistory() {
    if (!state.data) return [];
    return (state.data.history || []).map(x => {
      const meta = TX_META[x.type] || [String(x.type || 'Transaksi').replaceAll('_',' '), 'clock'];
      const amount = Number(x.total || 0) ? rp(x.total) : (x.invoiceNo || '');
      const st = String(x.status || '');
      return {
        txnId: x.txnId,
        title: meta[0],
        meta: [x.txnId, x.user, x.invoiceNo].filter(Boolean).join(' · '),
        amount,
        badge: st,
        cls: st === 'POSTED' ? 'ok' : st === 'REVERSED' ? 'warn' : st === 'FAILED' ? 'bad' : 'brand',
        icon: meta[1]
      };
    });
  }

  function renderHome() {
    const d = state.data || {};
    const dash = d.dashboard || {};
    const displayName = d.user && d.user.name ? d.user.name : 'User';
    const history = liveHistory();
    return `${pageHead(`${greeting()}, ${displayName}`, 'Pantau gudang tanpa membuka Google Sheet.', 'Live · ' + (d.version || 'backend'))}
      <section class="hero">
        <div class="hero-kicker"><span class="pulse"></span>Warehouse Control Center</div>
        <h3>${compactRp(dash.stockValue)}</h3>
        <p>Total nilai stok aktif · ${num(dash.activeMaterials, 0)} item master</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="purchase">+ Belanja Bahan</button>
          <button class="btn btn-soft" data-action="delivery">Buat Surat Jalan</button>
        </div>
      </section>

      <div class="kpi-grid">
        ${kpiCard('Dana Gudang', compactRp(dash.warehouseFunds), `Bank ${compactRp(dash.bankBalance)} · Kas ${compactRp(dash.cashBalance)}`, 'good')}
        ${kpiCard('Piutang Outlet', compactRp(dash.receivablesTotal), `${num(dash.receivablesCount,0)} tagihan aktif`)}
        ${kpiCard('Transit', `${num(dash.transitLines,0)} item`, compactRp(dash.transitValue), Number(dash.transitLines||0)===0?'good':'')}
        ${kpiCard('Recovery', num(dash.recoveryPending,0), Number(dash.recoveryPending||0)===0?'Tidak ada proses nyangkut':'Perlu perhatian', Number(dash.recoveryPending||0)===0?'good':'')}
      </div>

      <section class="section">
        <div class="section-head"><h3>Aksi Cepat</h3><button data-page-jump="transactions">Lihat semua</button></div>
        <div class="quick-grid">
          ${quickCard('pack','Batch Packing','Bulk → packed output','packing')}
          ${quickCard('truck','Surat Jalan','Gudang → Transit → Outlet','delivery')}
          ${quickCard('money','Pembayaran Outlet','Piutang → Kas / Bank','outletPayment')}
          ${quickCard('expense','Pengeluaran','Operasional gudang','expense')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h3>Aktivitas Terbaru</h3><span>Live backend</span></div>
        <div class="list">${history.slice(0,3).map(historyCard).join('') || '<div class="empty">Belum ada transaksi.</div>'}</div>
      </section>`;
  }

  function kpiCard(label, value, delta, cls='') {
    return `<div class="kpi"><small>${esc(label)}</small><strong>${esc(value)}</strong><span class="delta ${cls}">${esc(delta)}</span></div>`;
  }
  function quickCard(icon, title, desc, action) {
    return `<button class="quick-card" data-action="${action}"><span class="q-icon">${icons[icon]}</span><b>${esc(title)}</b><small>${esc(desc)}</small></button>`;
  }

  function renderStock() {
    return `${pageHead('Stok Gudang', 'Data live dari ledger/snapshot Warehouse.')}
      <div class="search-wrap">${icons.search}<input id="stockSearch" class="search" placeholder="Cari bahan atau kode..."></div>
      <div class="chips">${['Semua','Gudang','Bulk','Packed'].map(x=>`<button class="chip ${stockFilter===x?'is-active':''}" data-stock-filter="${x}">${x}</button>`).join('')}</div>
      <div id="stockRows" class="list">${stockRows(liveStocks())}</div>`;
  }

  function stockRows(rows) {
    const filtered = stockFilter === 'Semua' ? rows : rows.filter(x => x.type === stockFilter);
    return filtered.map(x => `<div class="stock-row"><div><b>${esc(x.name)}</b><small>${esc(x.code)} · ${esc(x.type)} · <span class="badge ${x.status==='Aman'?'ok':x.status==='Menipis'?'warn':'bad'}">${esc(x.status)}</span> · ${rp(x.value)}</small></div><div class="stock-qty"><strong>${num(x.qty)}</strong><span>${esc(x.unit)}</span></div></div>`).join('') || '<div class="empty">Tidak ada bahan pada filter ini.</div>';
  }

  function renderTransactions() {
    const modules = [
      ['cart','Belanja Bahan','LUNAS / TEMPO · Kas / Bank','purchase'],
      ['pack','Batch Packing','Output, remainder, waste & upah','packing'],
      ['truck','Distribusi / Surat Jalan','DRAFT → DIKIRIM → DITERIMA','delivery'],
      ['money','Pembayaran Outlet','Kurangi piutang & tambah saldo','outletPayment'],
      ['expense','Pengeluaran Operasional','Listrik, BBM, maintenance, dll','expense'],
      ['wallet','Bayar Supplier','Bank / Kas Gudang','supplierPayment'],
      ['audit','Opname / Koreksi','Adjustment dengan audit trail','adjustment'],
      ['money','Bayar Upah Packing','Kas / Bank · hutang upah','packingWage']
    ];
    return `${pageHead('Transaksi', 'Gate 1: data live sudah tersambung; posting masih lewat PWA produksi.', 'Live read-only')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>`;
  }
  function moduleCard(icon,title,desc,action){return `<button class="module-card" data-action="${action}"><span class="module-icon">${icons[icon]}</span><span class="copy"><b>${esc(title)}</b><small>${esc(desc)}</small></span><span class="chev">›</span></button>`}

  function renderHistory() {
    const rows = liveHistory();
    return `${pageHead('Riwayat', 'Riwayat transaksi live dari backend Warehouse.')}
      <div class="search-wrap">${icons.search}<input id="historySearch" class="search" placeholder="Cari transaksi..."></div>
      <div id="historyRows" class="list">${rows.map(historyCard).join('') || '<div class="empty">Belum ada transaksi.</div>'}</div>`;
  }
  function historyCard(x){return `<div class="list-card"><span class="list-icon">${icons[x.icon]||icons.clock}</span><div class="list-main"><b>${esc(x.title)}</b><small>${esc(x.meta)}</small></div><div class="list-side"><strong>${esc(x.amount)}</strong><small><span class="badge ${x.cls}">${esc(x.badge)}</span></small></div></div>`}

  function renderControl() {
    const d = state.data || {};
    const modules = [
      ['price','Harga Internal Outlet','Preview & sync harga dari Terima Bahan','internalPrice'],
      ['box','Master Bahan Wills','Source Master + katalog Warehouse','materials'],
      ['user','User & Role','OWNER · ADMIN · GUDANG · FINANCE','users'],
      ['audit','Audit Sistem','Invariant, recovery, integritas ledger','audit'],
      ['warning','Recovery Queue','Pantau transaksi yang perlu recovery','recovery'],
      ['wallet','Saldo Awal','Opening Bank / Opening Cash','opening']
    ];
    return `${pageHead('Kontrol', 'Koneksi GitHub ↔ Apps Script aktif.', 'Bridge aktif')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>
      <section class="section"><div class="section-head"><h3>Status Bridge</h3><span>${esc(config.VERSION || '')}</span></div>
        <div class="hero"><div class="hero-kicker"><span class="pulse"></span>Apps Script Connected</div><h3>LIVE READ-ONLY</h3><p>Login, dashboard, stok, dan riwayat sudah membaca backend produksi. Posting transaksi masih diarahkan ke PWA Apps Script sampai Gate Write diaktifkan.</p><div class="mini-bars"><i style="height:32%"></i><i style="height:54%"></i><i style="height:44%"></i><i style="height:72%"></i><i style="height:88%"></i><i style="height:68%"></i><i style="height:96%"></i></div></div>
      </section>
      <section class="section"><div class="list">
        <div class="list-card"><span class="list-icon">${icons.user}</span><div class="list-main"><b>${esc(d.user && d.user.name || '')}</b><small>${esc(d.user && d.user.role || '')} · ${esc(d.user && d.user.username || '')}</small></div><div class="list-side"><span class="badge ok">LOGIN</span></div></div>
        <div class="list-card"><span class="list-icon">${icons.audit}</span><div class="list-main"><b>Backend</b><small>${esc(d.version || '')}</small></div><div class="list-side"><span class="badge ok">LIVE</span></div></div>
      </div></section>`;
  }

  function setPage(page) {
    if (!pages[page] || !state.data) return;
    activePage = page;
    $('#content').innerHTML = pages[page]();
    $$('.nav-item').forEach(x => x.classList.toggle('is-active', x.dataset.page === page));
    bindPage();
    $('#content').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function bindPage() {
    $$('[data-action]').forEach(btn => btn.addEventListener('click', () => openReadOnlySheet(btn.dataset.action)));
    $$('[data-page-jump]').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.pageJump)));
    $$('[data-stock-filter]').forEach(btn => btn.addEventListener('click', () => { stockFilter = btn.dataset.stockFilter; setPage('stock'); }));
    const stockSearch = $('#stockSearch');
    if (stockSearch) stockSearch.addEventListener('input', () => {
      const q = stockSearch.value.trim().toLowerCase();
      const rows = liveStocks().filter(x => `${x.code} ${x.name}`.toLowerCase().includes(q));
      $('#stockRows').innerHTML = stockRows(rows);
    });
    const historySearch = $('#historySearch');
    if (historySearch) historySearch.addEventListener('input', () => {
      const q = historySearch.value.trim().toLowerCase();
      const rows = liveHistory().filter(x => `${x.title} ${x.meta} ${x.badge}`.toLowerCase().includes(q));
      $('#historyRows').innerHTML = rows.map(historyCard).join('') || '<div class="empty">Transaksi tidak ditemukan.</div>';
    });
  }

  const actionNames = {
    purchase:'Belanja Bahan', packing:'Batch Packing', delivery:'Surat Jalan', outletPayment:'Pembayaran Outlet', expense:'Pengeluaran Operasional', supplierPayment:'Bayar Supplier', adjustment:'Opname / Koreksi', packingWage:'Bayar Upah Packing', internalPrice:'Harga Internal Outlet', materials:'Master Bahan Wills', users:'User & Role', audit:'Audit Sistem', recovery:'Recovery Queue', opening:'Saldo Awal'
  };

  function openReadOnlySheet(action) {
    const title = actionNames[action] || 'Modul';
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grabber"></div><div class="sheet-head"><h3>${esc(title)}</h3><button class="sheet-close" id="sheetClose">×</button></div><p>Data GitHub sudah terhubung ke backend produksi. Untuk Gate 1 ini, transaksi <b>${esc(title)}</b> belum diizinkan dari GitHub agar ledger yang sudah berjalan tidak berubah sebelum write bridge lolos QA.</p><div class="demo-box"><b>LIVE READ-ONLY</b><br>Gunakan tombol di bawah untuk membuka PWA Apps Script produksi jika perlu melakukan transaksi sekarang.</div><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="openProduction">Buka PWA Produksi</button></div></div></div>`;
    $('#sheetClose').onclick = closeSheet;
    $('#sheetCancel').onclick = closeSheet;
    $('#sheetBackdrop').onclick = e => { if (e.target.id === 'sheetBackdrop') closeSheet(); };
    $('#openProduction').onclick = () => {
      const url = String(config.APPS_SCRIPT_URL || '').trim();
      if (!bridge.validWebAppUrl(url)) return toast('URL Apps Script belum valid.');
      window.open(url, '_blank', 'noopener');
    };
  }
  function closeSheet(){ $('#sheetRoot').innerHTML = ''; }

  function toast(message) {
    const root = $('#toastRoot');
    root.innerHTML = `<div class="toast">${esc(message)}</div>`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => root.innerHTML = '', 3200);
  }

  function setAuthStatus(text, isError = false) {
    const note = $('.auth-note');
    const copy = $('.auth-copy span:last-child');
    if (note) note.textContent = text;
    if (copy) copy.textContent = isError ? 'Backend belum tersambung' : 'Apps Script Bridge · Live';
  }

  async function loadAppWithToken(token, silent = false) {
    try {
      const data = await bridge.call('getAppData', token);
      state.token = token;
      state.data = data;
      localStorage.setItem(TOKEN_KEY, token);
      $('#loginView').classList.add('is-hidden');
      $('#mainView').classList.remove('is-hidden');
      $('#profileBtn').textContent = initials(data.user && data.user.name || 'WW');
      setPage(activePage);
      if (!silent) toast('Backend produksi tersambung · mode read-only.');
      return true;
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      state.token = '';
      state.data = null;
      if (!silent) toast(err.message);
      return false;
    }
  }

  function initials(name) {
    return String(name || 'WW').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || 'WW';
  }

  async function boot() {
    try {
      await bridge.init();
      state.bridgeReady = true;
      const pub = await bridge.call('getPublicState');
      state.publicState = pub;
      setAuthStatus('Backend Warehouse terhubung. Masuk dengan username dan PIN produksi.');
      const existing = localStorage.getItem(TOKEN_KEY) || '';
      if (existing && await loadAppWithToken(existing, true)) return;
    } catch (err) {
      state.bridgeReady = false;
      setAuthStatus(err.message, true);
      toast(err.message);
    }
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.bridgeReady) return toast('Bridge backend belum siap. Periksa config.js dan deployment Apps Script.');
    const username = $('#loginUser').value.trim();
    const pin = $('#loginPin').value.trim();
    const btn = e.submitter || e.target.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menghubungkan…'; }
    try {
      const r = await bridge.call('loginWarehouse', { username, pin });
      await loadAppWithToken(r.token);
      $('#loginPin').value = '';
    } catch (err) {
      toast(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk ke Warehouse'; }
    }
  });

  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.page)));
  $('#notifyBtn').addEventListener('click', () => {
    const dash = state.data && state.data.dashboard || {};
    const alerts = [];
    if (Number(dash.criticalStock||0)) alerts.push(`${dash.criticalStock} stok kritis`);
    if (Number(dash.lowStock||0)) alerts.push(`${dash.lowStock} stok menipis`);
    if (Number(dash.recoveryPending||0)) alerts.push(`${dash.recoveryPending} recovery`);
    if (Number(dash.packingWageCount||0)) alerts.push(`${dash.packingWageCount} upah packing belum lunas`);
    toast(alerts.length ? alerts.join(' · ') : 'Tidak ada alert sistem.');
  });
  $('#profileBtn').addEventListener('click', () => {
    const d = state.data || {};
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet"><div class="grabber"></div><div class="sheet-head"><h3>Profil</h3><button class="sheet-close" id="sheetClose">×</button></div><p><b>${esc(d.user && d.user.name || '')}</b><br>${esc(d.user && d.user.role || '')} · @${esc(d.user && d.user.username || '')}</p><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="logoutBtn">Logout</button></div></div></div>`;
    $('#sheetClose').onclick = closeSheet; $('#sheetCancel').onclick = closeSheet;
    $('#logoutBtn').onclick = async () => {
      try { if (state.token) await bridge.call('logoutWarehouse', state.token); } catch (_) {}
      localStorage.removeItem(TOKEN_KEY); state.token=''; state.data=null; closeSheet();
      $('#mainView').classList.add('is-hidden'); $('#loginView').classList.remove('is-hidden');
      toast('Logout berhasil.');
    };
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=0.2.0', { updateViaCache: 'none' }).then(reg => reg.update()).catch(() => {}));
  }

  boot();
})();
