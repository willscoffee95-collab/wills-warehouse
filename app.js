(() => {
  'use strict';

  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const config = window.WILLS_CONFIG || { MODE: 'live' };
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
    printer: '<svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7zM17 11h.01"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24"><path d="M9 5h6M9 3h6v4H9z"/><path d="M7 5H5v16h14V5h-2M8 13l2 2 5-5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>'
  };

  let state = {
    publicState: null,
    token: localStorage.getItem(TOKEN_KEY) || '',
    data: null,
    bridgeReady: false,
    fullLoaded: false,
    fullPromise: null
  };
  let activePage = 'home';
  let stockFilter = 'Semua';
  let featureOpening = false;
  let busyDepth = 0;
  let toastShowing = false;
  const toastQueue = [];
  let appHistoryReady = false;
  let sheetHistoryActive = false;
  let ignoreNextPop = false;
  let lastBackAt = 0;

  // v1.2.7.1 — UX guard patch on top of v1.2.7.0 role split.
  const ROLE_LABELS = Object.freeze({
    OWNER:'Owner', ADMIN:'Admin Legacy', ADMIN_1:'Admin 1', ADMIN_2:'Admin 2',
    STAFF_GUDANG:'Staff Gudang Legacy', STAFF_LOGISTIK:'Staff Logistik', FINANCE:'Finance'
  });
  const ROLE_PERMISSIONS = Object.freeze({
    OWNER:['*'],
    ADMIN:['STOCK_MANAGE','PURCHASE','PACKING','EXPENSE','SUPPLIER_MASTER','INTERNAL_PRICE','REQUEST_SYNC','DELIVERY_CREATE','DELIVERY_CANCEL','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DELIVERY_COMPLETE','OUTLET_PAYMENT','AUDIT_OPERATIONAL'],
    ADMIN_1:['STOCK_MANAGE','PURCHASE','PACKING','EXPENSE','SUPPLIER_MASTER','INTERNAL_PRICE','OUTLET_PAYMENT','SUPPLIER_PAYMENT','PACKING_WAGE_PAYMENT','AUDIT_OPERATIONAL'],
    ADMIN_2:['REQUEST_SYNC','DELIVERY_CREATE','DELIVERY_CANCEL','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DELIVERY_COMPLETE','AUDIT_OPERATIONAL'],
    STAFF_GUDANG:['PACKING','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC'],
    STAFF_LOGISTIK:['PACKING','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC'],
    FINANCE:['EXPENSE','OUTLET_PAYMENT','SUPPLIER_PAYMENT','PACKING_WAGE_PAYMENT','DELIVERY_SYNC','DELIVERY_COMPLETE']
  });
  const ACTION_PERMISSION = Object.freeze({
    purchase:'PURCHASE', packing:'PACKING', delivery:'DELIVERY_PREPARE', draftPrint:'DELIVERY_PREPARE',
    outletPayment:'OUTLET_PAYMENT', expense:'EXPENSE', supplierPayment:'SUPPLIER_PAYMENT', adjustment:'STOCK_MANAGE',
    packingWage:'PACKING_WAGE_PAYMENT', internalPrice:'INTERNAL_PRICE', users:'OWNER_ONLY', audit:'AUDIT_OPERATIONAL',
    recovery:'AUDIT_OPERATIONAL', opening:'OWNER_ONLY', materials:'ANY'
  });
  function roleName(role){return ROLE_LABELS[String(role||'').toUpperCase()]||String(role||'');}
  function currentRole(){return String((((state.data||{}).user||{}).role)||'').toUpperCase();}
  function roleCan(permission){
    if(permission==='ANY')return true;
    const role=currentRole();
    if(permission==='OWNER_ONLY')return role==='OWNER';
    const list=ROLE_PERMISSIONS[role]||[];
    return list.includes('*')||list.includes(permission);
  }
  function canAny(...permissions){return permissions.some(roleCan);}
  function actionAllowed(action){
    if(action==='delivery')return canAny('REQUEST_SYNC','DELIVERY_CREATE','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DELIVERY_COMPLETE');
    if(action==='draftPrint')return canAny('DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DELIVERY_COMPLETE');
    const permission=ACTION_PERMISSION[action];
    return !permission||roleCan(permission);
  }
  function visibleModuleRows(rows){return rows.filter(x=>actionAllowed(x[3]));}

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
  function pageHead(title, subtitle = '', chip) {
    const liveChip = chip === false ? '' : (chip || (state.bridgeReady ? 'Sistem aktif' : 'Belum tersambung'));
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${liveChip ? `<span class="sync-chip">${esc(liveChip)}</span>` : ''}</div>`;
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
      if (m.type === 'RAW_BULK') type = 'Curah';
      if (m.type === 'PACKED_OUTPUT') type = 'Hasil Packing';
      const statusRaw = String(s.status || '').toUpperCase();
      const status = statusRaw === 'MENIPIS' ? 'Menipis' : (statusRaw === 'KRITIS' || statusRaw === 'HABIS' ? 'Kritis' : 'Aman');
      return {
        code: s.code,
        name: s.name,
        qty: physicalQty,
        unit: m.receiveUnit || s.baseUnit || '',
        status,
        type,
        value: s.value == null ? null : Number(s.value || 0),
        avgCost: s.avgCost == null ? null : Number(s.avgCost || 0) * factor,
        minimum: Number(s.minimum || 0) / factor,
        safety: Number(s.safety || 0) / factor
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
    REVERSAL: ['Pembalikan Transaksi','audit'],
    INTERNAL_PRICE_UPDATE: ['Pembaruan Harga Internal','price'],
    INTERNAL_PRICE_BULK_SYNC: ['Sinkronisasi Harga Internal','price'],
    MASTER_SUPPLIER: ['Pembaruan Supplier','user'],
    SOURCE_MASTER_CONFIG: ['Pengaturan Sumber Bahan','audit'],
    SOURCE_MASTER_SYNC: ['Sinkronisasi Bahan Master','box']
  };

  function statusLabel(status) {
    const map = {
      POSTED:'SELESAI', REVERSED:'DIBALIKKAN', FAILED:'GAGAL', DRAFT:'DRAF',
      POSTING:'DIPROSES', PENDING:'MENUNGGU', CANCELLED:'DIBATALKAN', CANCELED:'DIBATALKAN'
    };
    const key = String(status || '').toUpperCase();
    return map[key] || String(status || '').replaceAll('_',' ');
  }

  function deliveryStatusClass(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'DRAFT') return 'status-draft';
    if (s === 'DIKIRIM') return 'status-sent';
    if (s === 'DIBATALKAN' || s === 'CANCELLED' || s === 'CANCELED') return 'status-cancelled';
    if (s === 'SELESAI') return 'status-done';
    if (s === 'DITERIMA') return 'status-received';
    if (s === 'SELISIH') return 'bad';
    return 'brand';
  }
  function deliveryStatusBadge(status) {
    return `<span class="badge ${deliveryStatusClass(status)}">${esc(String(status || '-').toUpperCase())}</span>`;
  }

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
        badge: statusLabel(st),
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
    const requestCount=((d.incomingRequests||[]).filter(x=>!['SELESAI','DIBATALKAN'].includes(String(x.warehouseStatus||''))).length);
    const draftCount=(d.deliveries||[]).filter(x=>String(x.status||'')==='DRAFT').length;
    const financeVisible=dash.financeVisible!==false;
    const heroActions=[];
    if(roleCan('PURCHASE')) heroActions.push('<button class="btn btn-primary" data-action="purchase">+ Belanja Bahan</button>');
    if(actionAllowed('delivery')) heroActions.push('<button class="btn btn-soft" data-action="delivery">Bahan Harus Dikirim</button>');
    const quick=[];
    if(roleCan('PACKING')) quick.push(quickCard('pack','Batch Packing','Bahan curah → hasil packing','packing'));
    if(actionAllowed('delivery')) quick.push(quickCard('truck','Bahan yang Harus Dikirim Sekarang','Cek daftar & siapkan bahan outlet','delivery'));
    if(actionAllowed('delivery')) quick.push(quickCard('truck','Surat Jalan','Pengiriman barang ke outlet','delivery'));
    if(actionAllowed('draftPrint')&&draftCount) quick.push(quickCard('printer','Draft Siap Kirim',`${draftCount} draft · cetak thermal Bluetooth`,'draftPrint'));
    if(roleCan('OUTLET_PAYMENT')) quick.push(quickCard('money','Pembayaran Outlet','Piutang dibayar ke Kas / Bank','outletPayment'));
    if(roleCan('EXPENSE')) quick.push(quickCard('expense','Pengeluaran','Operasional gudang','expense'));
    const heroValue=financeVisible?compactRp(dash.stockValue):`${num(dash.activeMaterials,0)} bahan`;
    const heroDesc=financeVisible?`Total nilai stok aktif · ${num(dash.activeMaterials,0)} bahan aktif`:'Permintaan outlet aktif ditampilkan melalui lonceng notifikasi';
    const kpis=financeVisible
      ? `${kpiCard('Dana Gudang', compactRp(dash.warehouseFunds), `Bank ${compactRp(dash.bankBalance)} · Kas ${compactRp(dash.cashBalance)}`, 'good')}${kpiCard('Piutang Outlet', compactRp(dash.receivablesTotal), `${num(dash.receivablesCount,0)} tagihan aktif`)}${kpiCard('Dalam Pengiriman', `${num(dash.transitLines,0)} item`, compactRp(dash.transitValue), Number(dash.transitLines||0)===0?'good':'')}${kpiCard('Pemulihan', num(dash.recoveryPending,0), Number(dash.recoveryPending||0)===0?'Tidak ada proses tertunda':'Perlu perhatian', Number(dash.recoveryPending||0)===0?'good':'')}`
      : `${kpiCard('Bahan Aktif', num(dash.activeMaterials,0), 'Stok fisik tersedia')}${kpiCard('Permintaan Outlet', 'Lihat Lonceng', 'Antrean aktif ada di notifikasi', 'good')}${kpiCard('Dalam Pengiriman', `${num(dash.transitLines,0)} item`, Number(dash.transitLines||0)===0?'Tidak ada barang di transit':'Sedang menuju outlet', Number(dash.transitLines||0)===0?'good':'')}${kpiCard('Pemulihan', num(dash.recoveryPending,0), Number(dash.recoveryPending||0)===0?'Tidak ada proses tertunda':'Perlu perhatian', Number(dash.recoveryPending||0)===0?'good':'')}`;
    return `${pageHead(`${greeting()}, ${displayName}`, roleName(d.user&&d.user.role||''), 'Sistem aktif')}
      <section class="hero">
        <div class="hero-kicker"><span class="pulse"></span>Pusat Kendali Gudang</div>
        <h3>${esc(heroValue)}</h3>
        <p>${esc(heroDesc)}</p>
        ${heroActions.length?`<div class="hero-actions">${heroActions.join('')}</div>`:''}
      </section>
      <div class="kpi-grid">${kpis}</div>
      ${quick.length?`<section class="section"><div class="section-head"><h3>Aksi Cepat</h3><button data-page-jump="transactions">Lihat semua</button></div><div class="quick-grid">${quick.join('')}</div></section>`:''}
      <section class="section"><div class="section-head"><h3>Aktivitas Terbaru</h3><span>Data terbaru</span></div><div class="list">${history.slice(0,3).map(historyCard).join('') || '<div class="empty">Belum ada transaksi.</div>'}</div></section>`;
  }

  function kpiCard(label, value, delta, cls='') {
    return `<div class="kpi"><small>${esc(label)}</small><strong>${esc(value)}</strong><span class="delta ${cls}">${esc(delta)}</span></div>`;
  }
  function quickCard(icon, title, desc, action) {
    return `<button class="quick-card" data-action="${action}"><span class="q-icon">${icons[icon]}</span><b>${esc(title)}</b><small>${esc(desc)}</small></button>`;
  }

  function renderStock() {
    return `${pageHead('Stok Gudang', 'Stok bahan terbaru dari sistem gudang.')}
      <div class="search-wrap">${icons.search}<input id="stockSearch" class="search" placeholder="Cari bahan atau kode..."></div>
      <div class="chips">${['Semua','Gudang','Curah','Hasil Packing'].map(x=>`<button class="chip ${stockFilter===x?'is-active':''}" data-stock-filter="${x}">${x}</button>`).join('')}</div>
      <div id="stockRows" class="list">${stockRows(liveStocks())}</div>`;
  }

  function stockRows(rows) {
    const filtered = stockFilter === 'Semua' ? rows : rows.filter(x => x.type === stockFilter);
    return filtered.map(x => `<div class="stock-row"><div><b>${esc(x.name)}</b><small>${esc(x.code)} · ${esc(x.type)} · <span class="badge ${x.status==='Aman'?'ok':x.status==='Menipis'?'warn':'bad'}">${esc(x.status)}</span>${x.value==null?'':' · '+rp(x.value)}</small></div><div class="stock-qty"><strong>${num(x.qty)}</strong><span>${esc(x.unit)}</span></div></div>`).join('') || '<div class="empty">Tidak ada bahan pada filter ini.</div>';
  }

  function renderTransactions() {
    const all = [
      ['cart','Belanja Bahan','Lunas / Tempo · Kas / Bank','purchase'],
      ['pack','Batch Packing','Hasil, sisa, susut & upah','packing'],
      ['truck','Bahan yang Harus Dikirim Sekarang','Cek notifikasi lalu siapkan pesanan outlet','delivery'],
      ['printer','Draft Siap Kirim','Checklist & cetak thermal Bluetooth','draftPrint'],
      ['money','Pembayaran Outlet','Kurangi piutang & tambah saldo','outletPayment'],
      ['expense','Pengeluaran Operasional','Listrik, BBM, maintenance, dll','expense'],
      ['wallet','Bayar Supplier','Bank / Kas Gudang','supplierPayment'],
      ['audit','Opname / Koreksi','Koreksi stok dengan jejak pemeriksaan','adjustment'],
      ['money','Bayar Upah Packing','Kas / Bank · hutang upah','packingWage']
    ];
    const modules=visibleModuleRows(all);
    return `${pageHead('Transaksi', 'Menu disesuaikan otomatis dengan hak akses ' + roleName(currentRole()) + '.', 'Siap transaksi')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('') || '<div class="empty">Tidak ada transaksi untuk role ini.</div>'}</div>`;
  }
  function moduleCard(icon,title,desc,action){return `<button class="module-card" data-action="${action}"><span class="module-icon">${icons[icon]}</span><span class="copy"><b>${esc(title)}</b><small>${esc(desc)}</small></span><span class="chev">›</span></button>`}

  function renderHistory() {
    const rows = liveHistory();
    return `${pageHead('Riwayat', 'Catatan transaksi terbaru dari sistem gudang.')}
      <div class="search-wrap">${icons.search}<input id="historySearch" class="search" placeholder="Cari transaksi..."></div>
      <div id="historyRows" class="list">${rows.map(historyCard).join('') || '<div class="empty">Belum ada transaksi.</div>'}</div>`;
  }
  function historyCard(x){const canRev=((state.data||{}).user||{}).role==='OWNER'&&x.badge==='SELESAI';return `<div class="list-card"><span class="list-icon">${icons[x.icon]||icons.clock}</span><div class="list-main"><b>${esc(x.title)}</b><small>${esc(x.meta)}</small></div><div class="list-side"><strong>${esc(x.amount)}</strong><small><span class="badge ${x.cls}">${esc(x.badge)}</span></small>${canRev?`<button class="history-reverse" data-reverse-txn="${esc(x.txnId)}">Batalkan</button>`:''}</div></div>`}

  function renderControl() {
    const d = state.data || {};
    const all = [
      ['price','Harga Internal Outlet','Pratinjau & samakan harga dari Terima Bahan','internalPrice'],
      ['box','Master Bahan Wills','Katalog bahan gudang','materials'],
      ['user','Pengguna & Peran','Owner · Admin 1 · Admin 2 · Finance · Staff Logistik','users'],
      ['audit','Audit Sistem','Pemeriksaan integritas dan keamanan transaksi','audit'],
      ['warning','Antrean Pemulihan','Pantau transaksi yang perlu dipulihkan','recovery'],
      ['wallet','Saldo Awal','Saldo awal Bank / Kas Gudang','opening']
    ];
    const modules=visibleModuleRows(all);
    return `${pageHead('Kontrol', 'Pengaturan dan pemantauan sesuai hak akses.', 'Sistem aktif')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>
      <section class="section"><div class="section-head"><h3>Status Sistem</h3><span>Terhubung</span></div>
        <div class="hero compact-hero"><div class="hero-kicker"><span class="pulse"></span>Sistem Gudang</div><h3>DATA TERSAMBUNG</h3><p>Dashboard, stok, riwayat, dan transaksi berjalan melalui sistem utama dengan audit dan idempotensi yang sama.</p></div>
      </section>
      <section class="section"><div class="list">
        <div class="list-card"><span class="list-icon">${icons.user}</span><div class="list-main"><b>${esc(d.user && d.user.name || '')}</b><small>${esc(roleName(d.user && d.user.role || ''))} · ${esc(d.user && d.user.username || '')}</small></div><div class="list-side"><span class="badge ok">MASUK</span></div></div>
        <div class="list-card"><span class="list-icon">${icons.audit}</span><div class="list-main"><b>Sistem Utama</b><small>Data gudang tersambung</small></div><div class="list-side"><span class="badge ok">AKTIF</span></div></div>
      </div></section>`;
  }

  async function setPage(page, options = {}) {
    if (!pages[page] || !state.data) return;
    const previous = activePage;
    const pushHistory = options.pushHistory !== false;
    if(page!=='home' && !state.fullLoaded){
      beginBusy('Memuat data…');
      try{await ensureFullData();}catch(e){toast(e.message);return;}finally{endBusy();}
    }
    activePage = page;
    $('#content').innerHTML = pages[page]();
    $$('.nav-item').forEach(x => x.classList.toggle('is-active', x.dataset.page === page));
    bindPage();
    $('#content').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (pushHistory && appHistoryReady && previous !== page) {
      history.pushState({ willsWarehouse: true, page }, document.title);
      lastBackAt = 0;
    }
  }

  function bindPage() {
    $$('[data-action]').forEach(btn => btn.addEventListener('click', () => openFeatureOneTap(btn.dataset.action, btn)));
    $$('[data-page-jump]').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.pageJump)));
    $$('[data-stock-filter]').forEach(btn => btn.addEventListener('click', () => { stockFilter = btn.dataset.stockFilter; setPage('stock'); }));
    const stockSearch = $('#stockSearch');
    if (stockSearch) stockSearch.addEventListener('input', () => {
      const q = stockSearch.value.trim().toLowerCase();
      const rows = liveStocks().filter(x => `${x.code} ${x.name}`.toLowerCase().includes(q));
      $('#stockRows').innerHTML = stockRows(rows);
    });
    $$('[data-reverse-txn]').forEach(btn=>btn.addEventListener('click',()=>directReverse(btn.dataset.reverseTxn)));
    const historySearch = $('#historySearch');
    if (historySearch) historySearch.addEventListener('input', () => {
      const q = historySearch.value.trim().toLowerCase();
      const rows = liveHistory().filter(x => `${x.title} ${x.meta} ${x.badge}`.toLowerCase().includes(q));
      $('#historyRows').innerHTML = rows.map(historyCard).join('') || '<div class="empty">Transaksi tidak ditemukan.</div>';
    });
  }

  const actionNames = {
    purchase:'Belanja Bahan', packing:'Batch Packing', delivery:'Bahan yang Harus Dikirim Sekarang / Surat Jalan', draftPrint:'Draft Siap Kirim / Cetak Thermal', outletPayment:'Pembayaran Outlet', expense:'Pengeluaran Operasional', supplierPayment:'Bayar Supplier', adjustment:'Opname / Koreksi', packingWage:'Bayar Upah Packing', internalPrice:'Harga Internal Outlet', materials:'Master Bahan Wills', users:'Pengguna & Peran', audit:'Audit Sistem', recovery:'Antrean Pemulihan', opening:'Saldo Awal'
  };

  async function openFeatureOneTap(action, trigger) {
    if (!actionNames[action]) return toast('Fitur tidak dikenali.');
    if (!actionAllowed(action)) return toast('Menu ini tidak termasuk hak akses ' + roleName(currentRole()) + '.');
    if (featureOpening || busyDepth > 0) return;
    featureOpening = true;
    if (trigger) {
      trigger.disabled = true;
      trigger.setAttribute('aria-busy', 'true');
      trigger.classList.add('is-loading');
    }
    beginBusy('Membuka ' + actionNames[action] + '…');
    try {
      await ensureFullData();
      openDirectSheet(action);
    } catch (err) {
      toast(err && err.message ? err.message : 'Fitur belum dapat dibuka.');
    } finally {
      endBusy();
      featureOpening = false;
      if (trigger) {
        trigger.disabled = false;
        trigger.removeAttribute('aria-busy');
        trigger.classList.remove('is-loading');
      }
    }
  }

  function pushSheetHistory() {
    if (!appHistoryReady || sheetHistoryActive) return;
    history.pushState({ willsWarehouse: true, page: activePage, sheet: true }, document.title);
    sheetHistoryActive = true;
  }
  function sheetHtml(title, body) {
    const root=$('#sheetRoot');
    root.innerHTML=`<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grabber"></div><div class="sheet-head"><h3>${esc(title)}</h3><button class="sheet-close" id="sheetClose">×</button></div>${body}</div></div>`;
    pushSheetHistory();
    $('#sheetClose').onclick=closeSheet; $('#sheetBackdrop').onclick=e=>{if(e.target.id==='sheetBackdrop')closeSheet()};
  }
  function idemKey(action){const k='ww_gh_idem_'+action;let x;try{x=JSON.parse(localStorage.getItem(k)||'null')}catch(_){x=null}if(x&&Date.now()-x.ts<86400000)return x.id;const id=action+':'+Date.now()+':'+Math.random().toString(36).slice(2);localStorage.setItem(k,JSON.stringify({id,ts:Date.now()}));return id}
  async function writeDirect(action,method,payload){const idem=idemKey(action);beginBusy('Menyimpan…');try{const r=await bridge.call(method,state.token,payload||{},idem);if(r&&r.ok===false)throw new Error(r.message||'Transaksi gagal');localStorage.removeItem('ww_gh_idem_'+action);toast('Berhasil disimpan'+(r&&r.txnId?' · '+r.txnId:''));closeSheet();await reloadFull();return r}catch(e){toast(e.message);throw e}finally{endBusy()}}
  async function reloadDeliveryModule(){const m=await bridge.call('getAppModule',state.token,'delivery');Object.assign(state.data,m||{});return m;}
  async function writeDeliveryDirect(action,method,payload,sjId){const idem=idemKey(action);beginBusy('Memproses Surat Jalan…');try{const r=await bridge.call(method,state.token,payload||{},idem);if(r&&r.ok===false)throw new Error(r.message||'Perintah gagal');localStorage.removeItem('ww_gh_idem_'+action);await reloadDeliveryModule();toast('Berhasil disimpan'+(r&&r.txnId?' · '+r.txnId:''));directDeliveryDetail(sjId);return r}catch(e){toast(e.message);throw e}finally{endBusy()}}
  async function callDirect(method,...args){return bridge.call(method,state.token,...args)}
  const matByCode=()=>Object.fromEntries(((state.data||{}).materials||[]).map(m=>[m.code,m]));
  const matOpts=(purch=false)=>((state.data||{}).materials||[]).filter(m=>m.active==='YA'&&(!purch||m.purchasable!==false)).map(m=>`<option value="${esc(m.code)}">${esc(m.name)} · ${esc(m.receiveUnit||'')}</option>`).join('');
  function openDirectSheet(action){
    if(action==='purchase')return directPurchase(); if(action==='packing')return directPacking(); if(action==='delivery')return directDelivery(); if(action==='draftPrint')return directDraftPrintList();
    if(action==='outletPayment')return directOutletPayment(); if(action==='expense')return directExpense(); if(action==='supplierPayment')return directSupplierPayment();
    if(action==='adjustment')return directAdjustment(); if(action==='packingWage')return directPackingWage(); if(action==='internalPrice')return directInternalPrice();
    if(action==='users')return directUsers(); if(action==='audit')return directAudit(); if(action==='recovery')return directRecovery(); if(action==='opening')return directOpening();
    if(action==='materials')return directMaterials();
    toast('Modul belum tersedia.');
  }
  function directPurchase(){const d=state.data||{},sups=d.suppliers||[];sheetHtml('Belanja Bahan',`<form id="ghPurchase"><label class="field"><span>Supplier</span><select name="supplierId"><option value="">Supplier sekali pakai</option>${sups.filter(x=>x.active==='YA').map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label class="field"><span>Nama supplier sekali pakai</span><input name="supplierName"></label><div class="form-2"><label class="field"><span>Pembayaran</span><select name="paymentStatus"><option>LUNAS</option><option>TEMPO</option></select></label><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label></div><div class="form-2"><label class="field"><span>Status nota</span><select name="notaStatus"><option>ADA NOTA</option><option>TANPA NOTA</option><option>NOTA MENYUSUL</option></select></label><label class="field"><span>No Nota</span><input name="invoiceNo"></label></div><label class="field"><span>Jatuh tempo (Tempo)</span><input name="dueDate" type="date"></label><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div id="ghPurchaseLines"></div><button class="btn btn-soft" type="button" id="ghAddPurchase">+ Tambah item</button><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary" type="submit">Posting Belanja</button></div></form>`);const box=$('#ghPurchaseLines'),add=()=>{const el=document.createElement('div');el.className='direct-line';el.innerHTML=`<select class="code" required><option value="">Pilih bahan</option>${matOpts(true)}</select><input class="qty" type="number" min="0.000001" step="0.000001" placeholder="Qty" required><input class="price" type="number" min="0" step="0.01" placeholder="Harga/unit" required><button class="line-remove" type="button">×</button>`;el.querySelector('.line-remove').onclick=()=>el.remove();box.appendChild(el)};add();$('#ghAddPurchase').onclick=add;$('#ghCancel').onclick=closeSheet;$('#ghPurchase').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),supplierId=fd.get('supplierId'),items=[...box.querySelectorAll('.direct-line')].map(x=>({code:x.querySelector('.code').value,qtyUnit:x.querySelector('.qty').value,priceUnit:x.querySelector('.price').value}));await writeDirect('purchase','postPurchase',{supplier:supplierId?{id:supplierId}:{name:fd.get('supplierName')},paymentStatus:fd.get('paymentStatus'),paymentSource:fd.get('paymentSource'),notaStatus:fd.get('notaStatus'),invoiceNo:fd.get('invoiceNo'),dueDate:fd.get('dueDate'),note:fd.get('note'),items})};}
  function directPacking(){const maps=((state.data||{}).mappings||[]).filter(x=>x.kind==='PACKING'&&x.active==='YA');sheetHtml('Batch Packing',`<form id="ghPack"><label class="field"><span>Proses</span><select name="mappingId" required><option value="">Pilih</option>${maps.map(x=>`<option value="${esc(x.id)}">${esc(x.sourceName)} → ${esc(x.outputName)}</option>`).join('')}</select></label><div class="form-2"><label class="field"><span>Bahan masuk (base)</span><input name="inputQtyBase" type="number" min="0.000001" step="0.000001" required></label><label class="field"><span>Pack bagus</span><input name="outputQtyUnit" type="number" min="1" step="1" required></label><label class="field"><span>Sisa usable</span><input name="remainderQtyBase" type="number" min="0" step="0.000001" value="0"></label><label class="field"><span>Waste</span><input name="wasteQtyBase" type="number" min="0" step="0.000001" value="0"></label></div><div class="form-2"><label class="field"><span>Packer</span><input name="packer" value="${esc((state.data.user||{}).name||'')}" required></label><label class="field"><span>Upah</span><input name="wageAmount" type="number" min="0" value="0"></label></div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting Packing</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghPack').onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.target).entries());await writeDirect('packing','postPackingBatch',p)};}
  function directDelivery(){
    const d=state.data||{},req=(d.incomingRequests||[]).filter(x=>!['SELESAI','DIBATALKAN'].includes(String(x.warehouseStatus||''))),rows=d.deliveries||[];
    const tools=[];
    if(roleCan('DELIVERY_CREATE'))tools.push('<button class="btn btn-primary" id="ghNewSj">+ SJ Manual</button>');
    if(roleCan('REQUEST_SYNC'))tools.push('<button class="btn btn-soft" id="ghSyncReq">Perbarui Permintaan</button>');
    if(roleCan('DELIVERY_SYNC'))tools.push('<button class="btn btn-primary" id="ghSyncRec">Sinkron Penerimaan</button>');
    if(canAny('AUDIT_OPERATIONAL','DELIVERY_SYNC'))tools.push('<button class="btn btn-line" id="ghDiag">Diagnostik</button>');
    sheetHtml('Bahan yang Harus Dikirim Sekarang',`${tools.length?`<div class="direct-toolbar">${tools.join('')}</div>`:''}<h4>Permintaan Aktif</h4><div class="direct-list">${req.map(x=>`<div class="direct-card"><b>${esc(x.outletName)} · ${esc(x.needDate||'')}</b><small>${esc(x.requestId)} · ${num(x.itemCount||0)} bahan${x.linkedNoSj?' · '+esc(x.linkedNoSj):''}</small><span class="badge warn">${esc(x.warehouseStatus||'')}</span></div>`).join('')||'<div class="empty">Tidak ada permintaan aktif.</div>'}</div><h4>Surat Jalan</h4><div class="direct-list">${rows.slice(0,30).map(x=>`<button class="direct-card direct-click" data-sjid="${esc(x.sjId)}"><b>${esc(x.noSj)} · ${esc(x.outletName)}</b><small>${(x.lines||[]).length} item${x.status==='DRAFT'?' · siap checklist thermal':''}${x.lastError?' · '+esc(x.lastError):''}</small>${deliveryStatusBadge(x.status)}</button>`).join('')||'<div class="empty">Belum ada SJ.</div>'}</div>`);
    const newSj=$('#ghNewSj');if(newSj)newSj.onclick=directNewSj;
    const syncReq=$('#ghSyncReq');if(syncReq)syncReq.onclick=async()=>{try{await withBusy('Memperbarui permintaan…',async()=>{await callDirect('syncOutletMaterialRequestsNowV1250');await reloadDeliveryModule();});toast('Permintaan diperbarui.');directDelivery()}catch(e){toast(e.message)}};
    const syncRec=$('#ghSyncRec');if(syncRec)syncRec.onclick=async()=>{try{let r;await withBusy('Sinkron penerimaan…',async()=>{r=await callDirect('syncOutletReceipts');await reloadDeliveryModule();});toast('Penerimaan disinkronkan'+(r&&r.elapsedMs?' · '+r.elapsedMs+' ms':''));directDelivery()}catch(e){toast(e.message)}};
    const diag=$('#ghDiag');if(diag)diag.onclick=async()=>{try{let r;await withBusy('Menjalankan diagnostik…',async()=>{r=await callDirect('auditReceiptSyncDiagnosticAppV1260')});showDiagnostic(r)}catch(e){toast(e.message)}};
    $$('[data-sjid]').forEach(b=>b.onclick=()=>directDeliveryDetail(b.dataset.sjid));
  }

  function directDraftPrintList(){
    const rows=((state.data||{}).deliveries||[]).filter(x=>String(x.status||'')==='DRAFT');
    sheetHtml('Draft Siap Kirim',`<p>Pilih draft yang sudah disiapkan. Checklist ini dicetak ke thermal Bluetooth dan dibawa bersama barang untuk pengecekan barista.</p><div class="direct-list">${rows.map(x=>`<button class="direct-card direct-click" data-print-sjid="${esc(x.sjId)}"><b>${esc(x.noSj)} · ${esc(x.outletName)}</b><small>${(x.lines||[]).length} bahan · ${esc(x.note||'Tanpa catatan')}</small><span class="badge brand">CETAK</span></button>`).join('')||'<div class="empty">Belum ada Surat Jalan berstatus DRAFT.</div>'}</div>`);
    $$('[data-print-sjid]').forEach(b=>b.onclick=()=>directPrintDeliveryDraft(b.dataset.printSjid));
  }

  function directNewSj(){const d=state.data||{},outs=(d.outlets||[]).filter(x=>x.active==='YA'),mats=(d.materials||[]).filter(x=>x.active==='YA'&&x.distributable!==false);sheetHtml('Buat Surat Jalan Manual',`<form id="ghSj"><label class="field"><span>Outlet</span><select name="outletCode" required><option value="">Pilih</option>${outs.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('')}</select></label><div id="ghSjLines"></div><button type="button" class="btn btn-soft" id="ghAddSj">+ Tambah bahan</button><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Buat DRAFT</button></div></form>`);const box=$('#ghSjLines'),opts=mats.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.receiveUnit||'')}</option>`).join(''),add=()=>{const el=document.createElement('div');el.className='direct-line';el.innerHTML=`<select class="code"><option value="">Pilih bahan</option>${opts}</select><input class="qty" type="number" min="0.000001" step="0.000001" placeholder="Qty unit"><span></span><button class="line-remove" type="button">×</button>`;el.querySelector('.line-remove').onclick=()=>el.remove();box.appendChild(el)};add();$('#ghAddSj').onclick=add;$('#ghCancel').onclick=closeSheet;$('#ghSj').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),items=[...box.querySelectorAll('.direct-line')].map(x=>({code:x.querySelector('.code').value,qtyUnit:x.querySelector('.qty').value}));await writeDirect('manualSj','createDeliveryDraft',{outletCode:fd.get('outletCode'),note:fd.get('note'),items})};}
  function directReverse(txnId){const reason=prompt('Alasan pembatalan / reversal transaksi '+txnId+':');if(!reason)return;writeDirect('reverse_'+txnId,'reverseTransaction',{txnId:txnId,reason:reason}).catch(()=>{});}
  function directDeliveryDetail(id){
    const d=((state.data||{}).deliveries||[]).find(x=>x.sjId===id);if(!d)return toast('SJ tidak ditemukan.');
    const canPrepare=roleCan('DELIVERY_PREPARE'),canCancel=roleCan('DELIVERY_CANCEL'),canDispatch=roleCan('DELIVERY_DISPATCH'),canComplete=roleCan('DELIVERY_COMPLETE'),canSync=roleCan('DELIVERY_SYNC');
    const req=findRequestForDelivery(d);
    const requestMeta=req?`<div class="delivery-request-meta"><b>Permintaan outlet</b><span>${esc(req.requestId)}${req.needDate?' · dibutuhkan '+esc(req.needDate):''}</span></div>`:'';
    sheetHtml(d.noSj,`<p><b>${esc(d.outletName)}</b> · ${deliveryStatusBadge(d.status)}${d.createdBy?' · dibuat '+esc(d.createdBy):''}</p>${requestMeta}<div class="direct-list">${(d.lines||[]).map(l=>{const requested=Number(l.requestedQtyUnit!=null?l.requestedQtyUnit:(l.qtyUnit||0)),approved=Number(l.qtyUnit||0),received=Number(l.receivedBase||0)/Number(l.factor||1),fulfillment=l.fulfillmentStatus||'DIPENUHI',fc=fulfillment==='DIPENUHI'?'ok':fulfillment==='TIDAK TERSEDIA'?'bad':'warn';return `<div class="direct-card"><b>${esc(l.name)}</b><small>Diminta ${num(requested)} · disiapkan ${num(approved)} ${esc(l.sendUnit)}${d.status!=='DRAFT'?' · diterima '+num(received):''}</small>${l.fulfillmentReason?`<small>Alasan: ${esc(l.fulfillmentReason)}</small>`:''}<span class="badge ${fc}">${esc(fulfillment)}</span></div>`}).join('')}</div><div class="actions">${d.status!=='DIBATALKAN'&&actionAllowed('draftPrint')?'<button class="btn btn-thermal" id="ghPrintSj">Cetak Thermal</button>':''}${d.status==='DRAFT'&&canPrepare?'<button class="btn btn-soft" id="ghAdjustSj">Atur Ketersediaan</button>':''}${d.status==='DRAFT'&&canCancel?'<button class="btn btn-line" id="ghCancelSj">Batalkan</button>':''}${d.status==='DRAFT'&&canDispatch?'<button class="btn btn-primary" id="ghSendSj">Konfirmasi Kirim</button>':''}${d.status==='DITERIMA'&&canComplete?'<button class="btn btn-primary" id="ghCompleteSj">Selesaikan & Bentuk Piutang</button>':''}${!['DRAFT','DIBATALKAN'].includes(d.status)&&canSync?'<button class="btn btn-soft" id="ghSyncSj">Sinkron SJ Ini</button>':''}</div>`);
    const p=$('#ghPrintSj');if(p)p.onclick=()=>directPrintDeliveryDraft(id);
    const a=$('#ghAdjustSj');if(a)a.onclick=()=>directFulfillment(id);
    const c=$('#ghCancelSj');if(c)c.onclick=()=>writeDeliveryDirect('cancel_'+id,'cancelDeliveryDraft',{sjId:id,reason:'Dibatalkan dari GitHub PWA'},id);
    const k=$('#ghSendSj');if(k)k.onclick=()=>confirm('Hanya qty yang sudah disiapkan/disetujui yang akan mengurangi stok. Barang benar-benar siap dikirim?')&&writeDeliveryDirect('dispatch_'+id,'dispatchDelivery',{sjId:id},id);
    const f=$('#ghCompleteSj');if(f)f.onclick=()=>confirm('Selesaikan SJ dan bentuk piutang outlet?')&&writeDirect('complete_'+id,'completeDelivery',{sjId:id});
    const y=$('#ghSyncSj');if(y)y.onclick=async()=>{try{let r;await withBusy('Sinkron SJ…',async()=>{r=await callDirect('syncOutletReceiptForDelivery',{sjId:id});if(!r.ok)throw new Error(r.error||'Sinkron gagal.');await reloadDeliveryModule();});toast('Penerimaan SJ diperbarui · '+r.elapsedMs+' ms');directDeliveryDetail(id)}catch(e){toast(e.message)}};
  }

  function findRequestForDelivery(d){
    return ((state.data||{}).incomingRequests||[]).find(x=>String(x.linkedSjId||'')===String(d.sjId||'')||String(x.linkedNoSj||'')===String(d.noSj||''))||null;
  }
  function wrapThermal(text,width){
    const words=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean),out=[];let line='';
    words.forEach(w=>{if(!line)line=w;else if((line+' '+w).length<=width)line+=' '+w;else{out.push(line);line=w;}});if(line)out.push(line);return out.length?out:[''];
  }
  function centerThermal(text,width){const t=String(text||'').slice(0,width),left=Math.max(0,Math.floor((width-t.length)/2));return ' '.repeat(left)+t;}
  function deliveryThermalText(d,width){
    width=Number(width)===48?48:32;const hr='-'.repeat(width),out=[],req=findRequestForDelivery(d),user=(state.data||{}).user||{};
    out.push(centerThermal('WILLS COFFEE',width));out.push(centerThermal(d.status==='DRAFT'?'DRAFT SIAP KIRIM':'CHECKLIST SURAT JALAN',width));out.push(hr);
    wrapThermal('No SJ: '+d.noSj,width).forEach(x=>out.push(x));wrapThermal('Outlet: '+d.outletName,width).forEach(x=>out.push(x));
    if(req&&req.needDate)wrapThermal('Dibutuhkan: '+req.needDate,width).forEach(x=>out.push(x));if(req&&req.requestId)wrapThermal('Request: '+req.requestId,width).forEach(x=>out.push(x));
    wrapThermal('Dicetak: '+new Intl.DateTimeFormat('id-ID',{dateStyle:'short',timeStyle:'short'}).format(new Date()),width).forEach(x=>out.push(x));wrapThermal('Petugas: '+(user.name||'-')+' / '+roleName(user.role),width).forEach(x=>out.push(x));out.push(hr);
    (d.lines||[]).forEach((l,i)=>{const requested=Number(l.requestedQtyUnit!=null?l.requestedQtyUnit:(l.qtyUnit||0)),approved=Number(l.qtyUnit||0),status=String(l.fulfillmentStatus||'DIPENUHI');wrapThermal('[ ] '+(i+1)+'. '+l.name,width).forEach(x=>out.push(x));wrapThermal('    Diminta: '+num(requested)+' '+(l.sendUnit||''),width).forEach(x=>out.push(x));wrapThermal('    Disiapkan: '+num(approved)+' '+(l.sendUnit||''),width).forEach(x=>out.push(x));if(status!=='DIPENUHI')wrapThermal('    Status: '+status,width).forEach(x=>out.push(x));if(l.fulfillmentReason)wrapThermal('    Alasan: '+l.fulfillmentReason,width).forEach(x=>out.push(x));out.push('');});
    out.push(hr);out.push('CHECK GUDANG');out.push('[ ] Jumlah sesuai draft');out.push('[ ] Kondisi bahan baik');out.push('[ ] Sudah dimuat/dibawa');out.push('');out.push('CHECK BARISTA OUTLET');out.push('[ ] Nama bahan sesuai');out.push('[ ] Jumlah diterima sesuai');out.push('[ ] Kondisi bahan baik');out.push('');wrapThermal('Nama Barista: __________________',width).forEach(x=>out.push(x));wrapThermal('Paraf: _________________________',width).forEach(x=>out.push(x));out.push(hr);wrapThermal('Setelah dicek, foto checklist ini dan kirim ke grup.',width).forEach(x=>out.push(x));if(d.note){out.push(hr);wrapThermal('Catatan: '+d.note,width).forEach(x=>out.push(x));}out.push('');out.push('');return out.join('\n');
  }
  function directPrintDeliveryDraft(id){
    const d=((state.data||{}).deliveries||[]).find(x=>x.sjId===id);if(!d)return toast('SJ tidak ditemukan.');
    let saved=Number(localStorage.getItem('ww_thermal_width')||32);if(saved!==48)saved=32;const initial=deliveryThermalText(d,saved);
    sheetHtml('Cetak Thermal Bluetooth',`<p>Format checklist dibuat untuk printer thermal. Pilih lebar printer lalu tekan <b>Cetak Bluetooth (RawBT)</b>.</p><label class="field thermal-width"><span>Lebar Printer</span><select id="thermalWidth"><option value="32" ${saved===32?'selected':''}>58 mm · 32 karakter</option><option value="48" ${saved===48?'selected':''}>80 mm · 48 karakter</option></select></label><pre class="thermal-preview" id="thermalPreview">${esc(initial)}</pre><div class="actions"><button class="btn btn-line" id="thermalBack" type="button">Kembali</button><button class="btn btn-soft" id="thermalBrowser" type="button">Print Sistem</button><button class="btn btn-thermal" id="thermalRawbt" type="button">Cetak Bluetooth (RawBT)</button></div><div class="thermal-note">Checklist fisik diberikan ke barista untuk dicentang. Setelah pengecekan, kertas dapat difoto dan dikirim ke grup sebagai bukti.</div>`);
    const sel=$('#thermalWidth'),preview=$('#thermalPreview');const update=()=>{const w=Number(sel.value)===48?48:32;localStorage.setItem('ww_thermal_width',String(w));preview.textContent=deliveryThermalText(d,w);return preview.textContent};
    sel.onchange=update;$('#thermalBack').onclick=()=>directDeliveryDetail(id);$('#thermalRawbt').onclick=()=>printRawBt(update());$('#thermalBrowser').onclick=()=>printThermalBrowser(update(),Number(sel.value));
  }
  function printRawBt(text){
    try{const a=document.createElement('a');a.href='rawbt:'+encodeURIComponent(String(text||''));a.style.display='none';document.body.appendChild(a);a.click();a.remove();toast('Membuka RawBT. Pilih printer Bluetooth yang sudah tersambung.');}catch(e){toast('RawBT tidak dapat dibuka: '+e.message);}
  }
  function printThermalBrowser(text,width){
    const w=window.open('','_blank','width=420,height=720');if(!w)return toast('Popup print diblokir browser.');const mm=Number(width)===48?'80mm':'58mm';w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Draft Siap Kirim</title><style>@page{size:'+mm+' auto;margin:3mm}body{margin:0;font:12px/1.35 monospace;color:#000}pre{white-space:pre-wrap;margin:0}</style></head><body><pre>'+esc(text)+'</pre></body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),120);
  }

  function directFulfillment(id){const d=((state.data||{}).deliveries||[]).find(x=>x.sjId===id);if(!d||d.status!=='DRAFT')return toast('SJ bukan DRAFT.');sheetHtml('Atur Ketersediaan',`<p>Permintaan asli outlet tidak diubah. Isi 0 jika tidak tersedia; alasan wajib jika qty dikurangi.</p><form id="ghFulfillment"><div class="direct-list">${(d.lines||[]).map(l=>{const req=Number(l.requestedQtyUnit!=null?l.requestedQtyUnit:(l.qtyUnit||0));return `<div class="direct-card" data-ful-line="${l.lineNo}"><b>${esc(l.name)}</b><small>Diminta ${num(req)} ${esc(l.sendUnit)}</small><label class="field"><span>Qty disetujui</span><input class="approved" type="number" min="0" max="${req}" step="0.000001" value="${Number(l.qtyUnit||0)}" required></label><label class="field"><span>Alasan jika kurang / kosong</span><textarea class="reason">${esc(l.fulfillmentReason||'')}</textarea></label></div>`}).join('')}</div><div class="actions"><button class="btn btn-line" type="button" id="ghBackSj">Kembali</button><button class="btn btn-primary">Simpan</button></div></form>`);$('#ghBackSj').onclick=()=>directDeliveryDetail(id);$('#ghFulfillment').onsubmit=async e=>{e.preventDefault();const items=$$('[data-ful-line]').map(x=>({lineNo:Number(x.dataset.fulLine),approvedQtyUnit:x.querySelector('.approved').value,reason:x.querySelector('.reason').value}));await writeDeliveryDirect('fulfillment_'+id,'adjustDeliveryDraftFulfillment',{sjId:id,items},id)};}
  function showDiagnostic(r){sheetHtml('Diagnostik Sinkron Penerimaan',`<p>Audit ini hanya membaca data outlet dan Surat Jalan.</p><div class="direct-list">${((r||{}).diagnostics||[]).map(x=>`<div class="direct-card"><b>${esc(x.noSj)} · ${esc(x.outletName||x.outletCode||'')}</b><small>${x.matched}/${x.receiptCount} receipt cocok · alias ${x.aliasMatched||0}</small><span class="badge ${x.ok?'ok':'bad'}">${x.ok?'COCOK':'PERLU CEK'}</span>${x.issues&&x.issues.length?`<div class="direct-issues">${x.issues.map(i=>esc((i.code||i.name)+' · '+i.reason+(i.expectedUnit?' · '+i.baseUnit+'→'+i.expectedUnit:''))).join('<br>')}</div>`:''}</div>`).join('')||'<div class="empty">Belum ada receipt yang cocok dengan SJ aktif.</div>'}</div>`)}
  function directOutletPayment(){const rows=((state.data||{}).receivables||[]).filter(x=>x.outstanding>0);sheetHtml('Pembayaran Outlet',`<form id="ghAr"><label class="field"><span>Masuk ke</span><select name="destination"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><label class="field"><span>Referensi</span><input name="reference"></label><div class="direct-list">${rows.map(x=>`<label class="direct-card"><b>${esc(x.outletName)} · ${esc(x.noSj)}</b><small>Sisa ${rp(x.outstanding)}</small><input type="checkbox" class="arck" data-id="${esc(x.sjId)}" data-outlet="${esc(x.outletCode)}"><input class="aramt" data-id="${esc(x.sjId)}" type="number" value="${x.outstanding}" min="0.01" max="${x.outstanding}"></label>`).join('')||'<div class="empty">Tidak ada piutang.</div>'}</div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting Pembayaran</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghAr').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),cks=$$('.arck:checked');const outs=[...new Set(cks.map(x=>x.dataset.outlet))];if(!cks.length)return toast('Pilih piutang.');if(outs.length>1)return toast('Satu pembayaran hanya untuk satu outlet.');await writeDirect('outletPayment','postOutletPayment',{destination:fd.get('destination'),reference:fd.get('reference'),note:fd.get('note'),allocations:cks.map(x=>({sjId:x.dataset.id,amount:$(`.aramt[data-id="${CSS.escape(x.dataset.id)}"]`).value}))})};}
  function directExpense(){const cats=(state.data||{}).expenseCategories||[];sheetHtml('Pengeluaran Operasional',`<form id="ghExp"><label class="field"><span>Kategori</span><select name="category">${cats.map(x=>`<option value="${esc(x.code)}">${esc(x.label)}</option>`).join('')}</select></label><div class="form-2"><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><label class="field"><span>Nominal</span><input name="amount" type="number" min="1" required></label></div><label class="field"><span>Referensi</span><input name="reference"></label><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghExp').onsubmit=async e=>{e.preventDefault();await writeDirect('expense','postOperationalExpense',Object.fromEntries(new FormData(e.target).entries()))};}
  function directSupplierPayment(){const rows=((state.data||{}).payables||[]).filter(x=>x.outstanding>0);sheetHtml('Bayar Supplier',`<form id="ghPaySup"><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><div class="direct-list">${rows.map(x=>`<label class="direct-card"><b>${esc(x.supplier)}</b><small>${esc(x.purchaseTxnId)} · ${rp(x.outstanding)}</small><input class="spck" type="checkbox" data-id="${esc(x.purchaseTxnId)}" data-sup="${esc(x.supplierId)}"><input class="spamt" data-id="${esc(x.purchaseTxnId)}" type="number" value="${x.outstanding}" min="0.01" max="${x.outstanding}"></label>`).join('')||'<div class="empty">Tidak ada hutang.</div>'}</div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghPaySup').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),cks=$$('.spck:checked'),sup=[...new Set(cks.map(x=>x.dataset.sup))];if(!cks.length)return toast('Pilih hutang.');if(sup.length>1)return toast('Pilih satu supplier.');await writeDirect('supplierPayment','postSupplierPayment',{paymentSource:fd.get('paymentSource'),note:fd.get('note'),allocations:cks.map(x=>({purchaseTxnId:x.dataset.id,amount:$(`.spamt[data-id="${CSS.escape(x.dataset.id)}"]`).value}))})};}
  function directAdjustment(){sheetHtml('Opname / Koreksi',`<form id="ghAdj"><label class="field"><span>Alasan</span><select name="reason"><option value="SELISIH_OPNAME">Selisih opname</option><option value="STOK_AWAL_TERLEWAT">Stok awal terlewat</option><option value="BARANG_DITEMUKAN">Barang ditemukan</option><option value="BARANG_RUSAK">Barang rusak</option><option value="BARANG_HILANG">Barang hilang</option><option value="KESALAHAN_PENCATATAN">Kesalahan pencatatan</option><option value="KOREKSI_INVESTIGASI">Koreksi investigasi</option><option value="LAINNYA">Lainnya</option></select></label><div id="ghAdjLines"></div><button class="btn btn-soft" type="button" id="ghAddAdj">+ Tambah bahan</button><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting Koreksi</button></div></form>`);const box=$('#ghAdjLines'),add=()=>{const el=document.createElement('div');el.className='direct-line';el.innerHTML=`<select class="code"><option value="">Pilih bahan</option>${matOpts(false)}</select><input class="physical" type="number" min="0" step="0.000001" placeholder="Stok fisik unit"><input class="cost" type="number" min="0" step="0.01" placeholder="Modal/unit jika perlu"><button class="line-remove" type="button">×</button>`;el.querySelector('.line-remove').onclick=()=>el.remove();box.appendChild(el)};add();$('#ghAddAdj').onclick=add;$('#ghCancel').onclick=closeSheet;$('#ghAdj').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),mm=matByCode(),items=[...box.querySelectorAll('.direct-line')].map(x=>{const m=mm[x.querySelector('.code').value],physical=Number(x.querySelector('.physical').value||0),cost=x.querySelector('.cost').value;return{code:m.code,physicalQtyBase:physical*Number(m.factor||1),unitCostBase:cost===''?'':Number(cost)/Number(m.factor||1)}});await writeDirect('adjustment','postStockAdjustment',{reason:fd.get('reason'),note:fd.get('note'),items})};}
  function directPackingWage(){const rows=((state.data||{}).packingWages||[]).filter(x=>x.outstanding>0);sheetHtml('Bayar Upah Packing',`<form id="ghPw"><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><div class="direct-list">${rows.map(x=>`<label class="direct-card"><b>${esc(x.packer)}</b><small>${esc(x.batchId)} · ${rp(x.outstanding)}</small><input class="pwck" type="checkbox" data-id="${esc(x.batchId)}" data-packer="${esc(x.packer)}"><input class="pwamt" data-id="${esc(x.batchId)}" type="number" value="${x.outstanding}" min="0.01" max="${x.outstanding}"></label>`).join('')||'<div class="empty">Tidak ada upah terhutang.</div>'}</div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghPw').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),cks=$$('.pwck:checked'),pack=[...new Set(cks.map(x=>x.dataset.packer))];if(!cks.length)return toast('Pilih upah.');if(pack.length>1)return toast('Pilih satu packer.');await writeDirect('packingWage','postPackingWagePayment',{paymentSource:fd.get('paymentSource'),note:fd.get('note'),allocations:cks.map(x=>({batchId:x.dataset.id,amount:$(`.pwamt[data-id="${CSS.escape(x.dataset.id)}"]`).value}))})};}
  function directInternalPrice(){const mats=((state.data||{}).materials||[]).filter(x=>x.active==='YA'&&x.distributable!==false);sheetHtml('Harga Internal Outlet',`<form id="ghPrice"><label class="field"><span>Bahan</span><select name="code"><option value="">Pilih</option>${mats.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${Number(x.internalPrice||0)>0?rp(x.internalPrice):'BELUM DISET'}</option>`).join('')}</select></label><label class="field"><span>Harga / unit</span><input name="internalPrice" type="number" min="0" required></label><div class="actions"><button class="btn btn-line" type="button" id="ghPreviewPrice">Preview dari Outlet</button><button class="btn btn-primary">Simpan</button></div></form><div id="ghPricePreview"></div>`);$('#ghPrice').onsubmit=async e=>{e.preventDefault();await writeDirect('internalPrice','saveWarehouseInternalPrice',Object.fromEntries(new FormData(e.target).entries()))};$('#ghPreviewPrice').onclick=async()=>{try{let r;await withBusy('Memuat preview harga…',async()=>{r=await callDirect('previewOutletReceiptInternalPrices')});$('#ghPricePreview').innerHTML=`<div class="demo-box">Siap diubah ${(r.stats||{}).ready||0} · Konflik ${(r.stats||{}).conflict||0} · Belum ada ${(r.stats||{}).missing||0}</div>`}catch(e){toast(e.message)}};}
  function directUsers(){
    const users=(state.data||{}).users||[];
    sheetHtml('Pengguna & Peran',`<div class="role-guide"><b>Pembagian kerja</b><span><strong>Admin 1</strong> · stok gudang, belanja/pemasukan, pengeluaran & koreksi stok</span><span><strong>Admin 2</strong> · cek pesanan outlet, siapkan bahan, Surat Jalan & pengiriman</span><span><strong>Finance</strong> · pembayaran, hutang/piutang & arus dana</span><span><strong>Staff Logistik</strong> · packing, penyiapan & pengiriman fisik</span></div><form id="ghUser"><label class="field"><span>Nama</span><input name="name" required></label><label class="field"><span>Username</span><input name="username" required></label><label class="field"><span>Role</span><select name="role"><option value="ADMIN_1">Admin 1</option><option value="ADMIN_2">Admin 2</option><option value="FINANCE">Finance</option><option value="STAFF_LOGISTIK">Staff Logistik</option><option value="OWNER">Owner</option></select></label><label class="field"><span>PIN</span><input name="pin" type="password" inputmode="numeric" required></label><div class="actions"><button class="btn btn-primary">Simpan User</button></div></form><div class="direct-list">${users.map(x=>`<div class="direct-card"><b>${esc(x.name)}</b><small>@${esc(x.username)} · ${esc(roleName(x.role))}${['ADMIN','STAFF_GUDANG'].includes(String(x.role||''))?' · legacy, sebaiknya ubah role':''}</small></div>`).join('')}</div>`);
    $('#ghUser').onsubmit=async e=>{e.preventDefault();await writeDirect('user','saveUser',Object.fromEntries(new FormData(e.target).entries()))};
  }
  function directAudit(){sheetHtml('Audit Sistem',`<div class="actions"><button class="btn btn-primary" id="ghAudit1260">Audit Warehouse</button><button class="btn btn-line" id="ghAuditReceipt">Diagnostik Penerimaan</button></div><pre id="ghAuditOut" class="audit-pre">Pilih audit.</pre>`);$('#ghAudit1260').onclick=async()=>{try{let r;await withBusy('Menjalankan audit…',async()=>{r=await callDirect('auditWarehouseAppV1260')});$('#ghAuditOut').textContent=JSON.stringify(r,null,2)}catch(e){toast(e.message)}};$('#ghAuditReceipt').onclick=async()=>{try{let r;await withBusy('Memeriksa penerimaan…',async()=>{r=await callDirect('auditReceiptSyncDiagnosticAppV1260')});showDiagnostic(r)}catch(e){toast(e.message)}};}
  function directRecovery(){const dash=(state.data||{}).dashboard||{};sheetHtml('Antrean Pemulihan',`<div class="demo-box"><b>${num(dash.recoveryPending||0)}</b> transaksi menunggu pemulihan. Recovery engine tetap berjalan di backend dan tidak boleh dihapus manual.</div>`)}
  function directOpening(){const c=(state.data||{}).controls||{};sheetHtml('Saldo Awal',`<p>Status: Stok ${c.openingStockOpen?'TERBUKA':'TERKUNCI'} · Bank ${c.openingBankOpen?'TERBUKA':'TERKUNCI'} · Kas ${c.openingCashOpen?'TERBUKA':'TERKUNCI'}.</p>${c.openingBankOpen?'<form id="ghOpenBank"><label class="field"><span>Nama rekening</span><input name="accountName" required></label><label class="field"><span>Saldo</span><input name="amount" type="number" min="0" required></label><button class="btn btn-primary">Posting Saldo Awal Bank</button></form>':''}${c.openingCashOpen?'<form id="ghOpenCash"><label class="field"><span>Referensi</span><input name="reference" value="Kas Gudang"></label><label class="field"><span>Saldo</span><input name="amount" type="number" min="0" required></label><button class="btn btn-primary">Posting Saldo Awal Kas</button></form>':''}`);const b=$('#ghOpenBank');if(b)b.onsubmit=async e=>{e.preventDefault();await writeDirect('openBank','postOpeningBank',Object.fromEntries(new FormData(e.target).entries()))};const csh=$('#ghOpenCash');if(csh)csh.onsubmit=async e=>{e.preventDefault();await writeDirect('openCash','postOpeningCash',Object.fromEntries(new FormData(e.target).entries()))};}
  function directMaterials(){const mats=(state.data||{}).materials||[];sheetHtml('Master Bahan Wills',`<div class="direct-list">${mats.map(x=>`<div class="direct-card"><b>${esc(x.name)}</b><small>${esc(x.code)} · 1 ${esc(x.receiveUnit)} = ${num(x.factor)} ${esc(x.baseUnit)}</small></div>`).join('')}</div>`)}
  function closeSheet(options = {}){
    $('#sheetRoot').innerHTML = '';
    const fromBack = options.fromBack === true;
    if (sheetHistoryActive) {
      sheetHistoryActive = false;
      if (!fromBack && appHistoryReady) {
        ignoreNextPop = true;
        history.back();
      }
    }
  }

  function beginBusy(label = 'Memuat…') {
    busyDepth += 1;
    const root = $('#busyRoot');
    const text = $('#busyText');
    if (text) text.textContent = label;
    if (root) root.classList.remove('is-hidden');
    document.documentElement.classList.add('app-busy');
  }
  function endBusy() {
    busyDepth = Math.max(0, busyDepth - 1);
    if (busyDepth > 0) return;
    const root = $('#busyRoot');
    if (root) root.classList.add('is-hidden');
    document.documentElement.classList.remove('app-busy');
  }
  async function withBusy(label, fn) {
    beginBusy(label);
    try { return await fn(); } finally { endBusy(); }
  }

  function toast(message, duration = 3600) {
    const text = String(message == null ? '' : message).trim();
    if (!text) return;
    toastQueue.push({ message: text, duration: Math.max(3000, Number(duration || 3600)) });
    showNextToast();
  }
  function showNextToast() {
    if (toastShowing || !toastQueue.length) return;
    toastShowing = true;
    const item = toastQueue.shift();
    const root = $('#toastRoot');
    root.innerHTML = `<div class="toast">${esc(item.message)}</div>`;
    setTimeout(() => {
      root.innerHTML = '';
      toastShowing = false;
      setTimeout(showNextToast, 120);
    }, item.duration);
  }

  function initAppHistory() {
    if (appHistoryReady) return;
    history.replaceState({ willsWarehouse: true, page: 'home', base: true }, document.title);
    history.pushState({ willsWarehouse: true, page: 'home', guard: true }, document.title);
    appHistoryReady = true;
    lastBackAt = 0;
  }

  window.addEventListener('popstate', event => {
    if (!appHistoryReady || $('#mainView').classList.contains('is-hidden')) return;
    if (ignoreNextPop) { ignoreNextPop = false; return; }
    if ($('#sheetRoot').children.length) {
      sheetHistoryActive = false;
      closeSheet({ fromBack: true });
      return;
    }
    const target = event.state && event.state.willsWarehouse ? event.state.page : 'home';
    if (activePage !== target) {
      setPage(target || 'home', { pushHistory: false });
      lastBackAt = 0;
      return;
    }
    if (activePage !== 'home') {
      setPage('home', { pushHistory: false });
      history.pushState({ willsWarehouse: true, page: 'home', guard: true }, document.title);
      return;
    }
    const now = Date.now();
    if (now - lastBackAt < 2200) {
      appHistoryReady = false;
      history.back();
      return;
    }
    lastBackAt = now;
    toast('Sudah di Beranda. Tekan tombol kembali sekali lagi untuk keluar.');
    history.pushState({ willsWarehouse: true, page: 'home', guard: true }, document.title);
  });

  function stockAlerts() {
    const priority = {Kritis:0, Menipis:1};
    return liveStocks()
      .filter(x => x.status === 'Kritis' || x.status === 'Menipis')
      .sort((a,b) => (priority[a.status] - priority[b.status]) || String(a.name).localeCompare(String(b.name), 'id'));
  }

  function notificationCount() {
    const dash = state.data && state.data.dashboard || {};
    let count = stockAlerts().length;
    if (Number(dash.recoveryPending || 0) > 0) count += 1;
    if (Number(dash.packingWageCount || 0) > 0) count += 1;
    const req=((state.data||{}).incomingRequests||[]).filter(x=>!['SELESAI','DIBATALKAN'].includes(String(x.warehouseStatus||'')));
    if(req.length) count += 1;
    return count;
  }

  function updateNotificationBadge() {
    const badge = $('#notifyBadge');
    const btn = $('#notifyBtn');
    if (!badge || !btn) return;
    const count = state.data ? notificationCount() : 0;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('is-hidden', count === 0);
    btn.setAttribute('aria-label', count ? `Notifikasi, ${count} perlu perhatian` : 'Notifikasi, tidak ada yang perlu perhatian');
  }

  function openNotifications() {
    const root = $('#sheetRoot');
    const alerts = stockAlerts();
    const dash = state.data && state.data.dashboard || {};
    const stockHtml = alerts.length ? alerts.map(x => {
      const isCritical = x.status === 'Kritis';
      const minText = Number(x.minimum || 0) > 0 ? ` · Batas minimum ${num(x.minimum)} ${esc(x.unit)}` : '';
      return `<div class="notice-row"><span class="notice-icon ${isCritical ? 'bad' : ''}">${icons.warning}</span><div class="notice-copy"><b>${esc(x.name)}</b><small>${esc(x.code)} · Stok ${num(x.qty)} ${esc(x.unit)}${minText}</small></div><div class="notice-side"><strong>${num(x.qty)} ${esc(x.unit)}</strong><span class="badge ${isCritical ? 'bad' : 'warn'}">${esc(x.status)}</span></div></div>`;
    }).join('') : '<div class="notice-ok">Semua stok bahan masih dalam kondisi aman.</div>';

    const other = [];
    if (Number(dash.recoveryPending || 0) > 0) other.push(`<div class="notice-row"><span class="notice-icon bad">${icons.warning}</span><div class="notice-copy"><b>Pemulihan transaksi</b><small>Ada transaksi yang perlu diperiksa sistem.</small></div><div class="notice-side"><strong>${num(dash.recoveryPending,0)}</strong><span class="badge bad">PERIKSA</span></div></div>`);
    if (Number(dash.packingWageCount || 0) > 0) other.push(`<div class="notice-row"><span class="notice-icon">${icons.money}</span><div class="notice-copy"><b>Upah packing belum dibayar</b><small>${num(dash.packingWageCount,0)} kewajiban upah masih terbuka.</small></div><div class="notice-side"><strong>${compactRp(dash.packingWageOutstanding)}</strong><span class="badge warn">BELUM LUNAS</span></div></div>`);
    const req=((state.data||{}).incomingRequests||[]).filter(x=>!['SELESAI','DIBATALKAN'].includes(String(x.warehouseStatus||'')));
    if(req.length) other.push(`<div class="notice-row"><span class="notice-icon">${icons.truck}</span><div class="notice-copy"><b>Bahan yang Harus Dikirim Sekarang</b><small>${req.slice(0,4).map(x=>esc(x.outletName)+' · '+num(x.itemCount||0)+' bahan').join('<br>')}${req.length>4?'<br>+'+(req.length-4)+' permintaan lainnya':''}</small></div><div class="notice-side"><strong>${req.length}</strong><span class="badge warn">SIAPKAN</span></div></div>`);

    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Pemberitahuan"><div class="grabber"></div><div class="sheet-head"><h3>Pemberitahuan</h3><button class="sheet-close" id="sheetClose">×</button></div><div class="notice-section"><div class="notice-heading"><b>Bahan yang perlu dibelanja</b><span>${alerts.length} bahan</span></div><div class="notice-list">${stockHtml}</div></div>${other.length ? `<div class="notice-section"><div class="notice-heading"><b>Perlu perhatian</b><span>${other.length} pemberitahuan</span></div><div class="notice-list">${other.join('')}</div></div>` : ''}<div class="notice-summary">Daftar belanja mengikuti status stok <b>Kritis</b> dan <b>Menipis</b> dari sistem gudang. Nama bahan dan jumlah stok ditampilkan langsung agar Admin bisa menindaklanjuti tanpa menebak itemnya.</div></div></div>`;
    pushSheetHistory();
    $('#sheetClose').onclick = closeSheet;
    $('#sheetBackdrop').onclick = e => { if (e.target.id === 'sheetBackdrop') closeSheet(); };
  }

  function setAuthStatus(isReady, detail = '') {
    const indicator = $('#authConnection');
    const btn = $('#loginBtn');
    state.bridgeReady = Boolean(isReady);
    if (indicator) {
      indicator.classList.toggle('is-ready', state.bridgeReady);
      indicator.dataset.state = state.bridgeReady ? 'ready' : 'offline';
      indicator.setAttribute('aria-label', state.bridgeReady ? 'Sistem siap' : 'Sistem belum siap');
      indicator.title = state.bridgeReady ? 'Sistem siap' : 'Sistem belum siap';
    }
    if (btn) btn.disabled = !state.bridgeReady;
    if (detail && !state.bridgeReady) console.warn('[Wills Warehouse] Sistem belum siap:', detail);
  }

  async function loadFullData(token=state.token){if(state.fullLoaded&&state.data)return state.data;if(state.fullPromise)return state.fullPromise;state.fullPromise=bridge.call('getAppData',token).then(data=>{state.data={...(state.data||{}),...data};state.fullLoaded=true;state.fullPromise=null;updateNotificationBadge();if(activePage==='home'){const c=$('#content');if(c){c.innerHTML=renderHome();bindPage();}}else setPage(activePage);return state.data}).catch(e=>{state.fullPromise=null;throw e});return state.fullPromise;}
  async function ensureFullData(){if(!state.fullLoaded)await loadFullData();return state.data;}
  async function reloadFull(){state.fullLoaded=false;state.fullPromise=null;await loadFullData();setPage(activePage);}
  async function loadAppWithToken(token, silent = false) {
    try {
      const data = await bridge.call('getAppBootstrap', token);
      state.token = token; state.data = data; state.fullLoaded=false; state.fullPromise=null;
      localStorage.setItem(TOKEN_KEY, token);
      $('#loginView').classList.add('is-hidden'); $('#mainView').classList.remove('is-hidden');
      $('#profileBtn').textContent = initials(data.user && data.user.name || 'WW');
      updateNotificationBadge(); await setPage('home', { pushHistory: false }); initAppHistory();
      loadFullData(token).catch(err=>console.warn('[Wills Warehouse] background full load:',err.message));
      if (!silent) toast('Sistem siap digunakan.'); return true;
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY); state.token=''; state.data=null; state.fullLoaded=false;
      if (!silent) toast(err.message); return false;
    }
  }

  function initials(name) {
    return String(name || 'WW').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || 'WW';
  }

  async function boot() {
    try {
      // v1.2.7.1: lampu siap tetap cepat; UX loading sekarang memakai busy guard.
      // Begitu bridge siap menerima login, indikator langsung hijau; public state dimuat paralel.
      await bridge.init();
      setAuthStatus(true);
      bridge.call('getPublicState').then(pub=>{state.publicState=pub;}).catch(err=>console.warn('[Wills Warehouse] public state:',err.message));
      const existing = localStorage.getItem(TOKEN_KEY) || '';
      if (existing && await loadAppWithToken(existing, true)) return;
    } catch (err) {
      setAuthStatus(false, err.message);
      toast('Sistem belum siap. Coba beberapa saat lagi.');
    }
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.bridgeReady) return toast('Sistem belum siap. Coba beberapa saat lagi.');
    const username = $('#loginUser').value.trim();
    const pin = $('#loginPin').value.trim();
    const btn = e.submitter || e.target.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menghubungkan…'; btn.setAttribute('aria-busy','true'); btn.classList.add('is-loading'); }
    beginBusy('Menghubungkan…');
    try {
      const r = await bridge.call('loginWarehouse', { username, pin });
      await loadAppWithToken(r.token);
      $('#loginPin').value = '';
    } catch (err) {
      toast(err.message);
    } finally {
      endBusy();
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk ke Warehouse'; btn.removeAttribute('aria-busy'); btn.classList.remove('is-loading'); }
    }
  });

  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.page)));
  $('#notifyBtn').addEventListener('click', openNotifications);
  $('#profileBtn').addEventListener('click', () => {
    const d = state.data || {};
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet"><div class="grabber"></div><div class="sheet-head"><h3>Profil</h3><button class="sheet-close" id="sheetClose">×</button></div><p><b>${esc(d.user && d.user.name || '')}</b><br>${esc(roleName(d.user && d.user.role || ''))} · @${esc(d.user && d.user.username || '')}</p><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="logoutBtn">Logout</button></div></div></div>`;
    pushSheetHistory();
    $('#sheetClose').onclick = closeSheet; $('#sheetCancel').onclick = closeSheet;
    $('#logoutBtn').onclick = async () => {
      beginBusy('Logout…');
      try { try { if (state.token) await bridge.call('logoutWarehouse', state.token); } catch (_) {}
        localStorage.removeItem(TOKEN_KEY); state.token=''; state.data=null; updateNotificationBadge(); closeSheet();
        appHistoryReady=false; sheetHistoryActive=false; history.replaceState({willsLogin:true}, document.title);
        $('#mainView').classList.add('is-hidden'); $('#loginView').classList.remove('is-hidden');
        toast('Logout berhasil.');
      } finally { endBusy(); }
    };
  });

  if ('serviceWorker' in navigator) {
    let reloadingForUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
      window.location.reload();
    });
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=0.4.1', { updateViaCache: 'none' }).then(reg => reg.update()).catch(() => {}));
  }

  // Scroll tetap native/normal. Pull-to-refresh dicegah lewat CSS overscroll-behavior,
  // bukan dengan membatalkan touchmove sehingga tarikan layar tetap terasa normal.

  boot();
})();
