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
        value: Number(s.value || 0),
        avgCost: Number(s.avgCost || 0) * factor,
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
    return `${pageHead(`${greeting()}, ${displayName}`, '', 'Sistem aktif')}
      <section class="hero">
        <div class="hero-kicker"><span class="pulse"></span>Pusat Kendali Gudang</div>
        <h3>${compactRp(dash.stockValue)}</h3>
        <p>Total nilai stok aktif · ${num(dash.activeMaterials, 0)} bahan aktif</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="purchase">+ Belanja Bahan</button>
          <button class="btn btn-soft" data-action="delivery">Buat Surat Jalan</button>
        </div>
      </section>

      <div class="kpi-grid">
        ${kpiCard('Dana Gudang', compactRp(dash.warehouseFunds), `Bank ${compactRp(dash.bankBalance)} · Kas ${compactRp(dash.cashBalance)}`, 'good')}
        ${kpiCard('Piutang Outlet', compactRp(dash.receivablesTotal), `${num(dash.receivablesCount,0)} tagihan aktif`)}
        ${kpiCard('Dalam Pengiriman', `${num(dash.transitLines,0)} item`, compactRp(dash.transitValue), Number(dash.transitLines||0)===0?'good':'')}
        ${kpiCard('Pemulihan', num(dash.recoveryPending,0), Number(dash.recoveryPending||0)===0?'Tidak ada proses tertunda':'Perlu perhatian', Number(dash.recoveryPending||0)===0?'good':'')}
      </div>

      <section class="section">
        <div class="section-head"><h3>Aksi Cepat</h3><button data-page-jump="transactions">Lihat semua</button></div>
        <div class="quick-grid">
          ${quickCard('pack','Batch Packing','Bahan curah → hasil packing','packing')}
          ${quickCard('truck','Surat Jalan','Pengiriman barang ke outlet','delivery')}
          ${quickCard('money','Pembayaran Outlet','Piutang dibayar ke Kas / Bank','outletPayment')}
          ${quickCard('expense','Pengeluaran','Operasional gudang','expense')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h3>Aktivitas Terbaru</h3><span>Data terbaru</span></div>
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
    return `${pageHead('Stok Gudang', 'Stok bahan terbaru dari sistem gudang.')}
      <div class="search-wrap">${icons.search}<input id="stockSearch" class="search" placeholder="Cari bahan atau kode..."></div>
      <div class="chips">${['Semua','Gudang','Curah','Hasil Packing'].map(x=>`<button class="chip ${stockFilter===x?'is-active':''}" data-stock-filter="${x}">${x}</button>`).join('')}</div>
      <div id="stockRows" class="list">${stockRows(liveStocks())}</div>`;
  }

  function stockRows(rows) {
    const filtered = stockFilter === 'Semua' ? rows : rows.filter(x => x.type === stockFilter);
    return filtered.map(x => `<div class="stock-row"><div><b>${esc(x.name)}</b><small>${esc(x.code)} · ${esc(x.type)} · <span class="badge ${x.status==='Aman'?'ok':x.status==='Menipis'?'warn':'bad'}">${esc(x.status)}</span> · ${rp(x.value)}</small></div><div class="stock-qty"><strong>${num(x.qty)}</strong><span>${esc(x.unit)}</span></div></div>`).join('') || '<div class="empty">Tidak ada bahan pada filter ini.</div>';
  }

  function renderTransactions() {
    const modules = [
      ['cart','Belanja Bahan','Lunas / Tempo · Kas / Bank','purchase'],
      ['pack','Batch Packing','Hasil, sisa, susut & upah','packing'],
      ['truck','Distribusi / Surat Jalan','Draf → Dikirim → Diterima','delivery'],
      ['money','Pembayaran Outlet','Kurangi piutang & tambah saldo','outletPayment'],
      ['expense','Pengeluaran Operasional','Listrik, BBM, maintenance, dll','expense'],
      ['wallet','Bayar Supplier','Bank / Kas Gudang','supplierPayment'],
      ['audit','Opname / Koreksi','Koreksi dengan jejak pemeriksaan','adjustment'],
      ['money','Bayar Upah Packing','Kas / Bank · hutang upah','packingWage']
    ];
    return `${pageHead('Transaksi', 'Data gudang sudah tersambung. Untuk sementara transaksi dilakukan melalui aplikasi utama.', 'Hanya baca')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>`;
  }
  function moduleCard(icon,title,desc,action){return `<button class="module-card" data-action="${action}"><span class="module-icon">${icons[icon]}</span><span class="copy"><b>${esc(title)}</b><small>${esc(desc)}</small></span><span class="chev">›</span></button>`}

  function renderHistory() {
    const rows = liveHistory();
    return `${pageHead('Riwayat', 'Catatan transaksi terbaru dari sistem gudang.')}
      <div class="search-wrap">${icons.search}<input id="historySearch" class="search" placeholder="Cari transaksi..."></div>
      <div id="historyRows" class="list">${rows.map(historyCard).join('') || '<div class="empty">Belum ada transaksi.</div>'}</div>`;
  }
  function historyCard(x){return `<div class="list-card"><span class="list-icon">${icons[x.icon]||icons.clock}</span><div class="list-main"><b>${esc(x.title)}</b><small>${esc(x.meta)}</small></div><div class="list-side"><strong>${esc(x.amount)}</strong><small><span class="badge ${x.cls}">${esc(x.badge)}</span></small></div></div>`}

  function renderControl() {
    const d = state.data || {};
    const modules = [
      ['price','Harga Internal Outlet','Pratinjau & samakan harga dari Terima Bahan','internalPrice'],
      ['box','Master Bahan Wills','Sumber master + katalog gudang','materials'],
      ['user','Pengguna & Peran','Pemilik · Admin · Gudang · Keuangan','users'],
      ['audit','Audit Sistem','Pemeriksaan integritas dan keamanan transaksi','audit'],
      ['warning','Antrean Pemulihan','Pantau transaksi yang perlu dipulihkan','recovery'],
      ['wallet','Saldo Awal','Saldo awal Bank / Kas Gudang','opening']
    ];
    return `${pageHead('Kontrol', 'Pengaturan dan pemantauan sistem gudang.', 'Sistem aktif')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>
      <section class="section"><div class="section-head"><h3>Status Sistem</h3><span>Terhubung</span></div>
        <div class="hero"><div class="hero-kicker"><span class="pulse"></span>Sistem Gudang</div><h3>DATA TERSAMBUNG</h3><p>Dashboard, stok, dan riwayat sudah membaca data dari sistem utama. Untuk sementara transaksi dilakukan melalui aplikasi utama.</p><div class="mini-bars"><i style="height:32%"></i><i style="height:54%"></i><i style="height:44%"></i><i style="height:72%"></i><i style="height:88%"></i><i style="height:68%"></i><i style="height:96%"></i></div></div>
      </section>
      <section class="section"><div class="list">
        <div class="list-card"><span class="list-icon">${icons.user}</span><div class="list-main"><b>${esc(d.user && d.user.name || '')}</b><small>${esc(d.user && d.user.role || '')} · ${esc(d.user && d.user.username || '')}</small></div><div class="list-side"><span class="badge ok">MASUK</span></div></div>
        <div class="list-card"><span class="list-icon">${icons.audit}</span><div class="list-main"><b>Sistem Utama</b><small>Data gudang tersambung</small></div><div class="list-side"><span class="badge ok">AKTIF</span></div></div>
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
    purchase:'Belanja Bahan', packing:'Batch Packing', delivery:'Surat Jalan', outletPayment:'Pembayaran Outlet', expense:'Pengeluaran Operasional', supplierPayment:'Bayar Supplier', adjustment:'Opname / Koreksi', packingWage:'Bayar Upah Packing', internalPrice:'Harga Internal Outlet', materials:'Master Bahan Wills', users:'Pengguna & Peran', audit:'Audit Sistem', recovery:'Antrean Pemulihan', opening:'Saldo Awal'
  };

  function openReadOnlySheet(action) {
    const title = actionNames[action] || 'Modul';
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grabber"></div><div class="sheet-head"><h3>${esc(title)}</h3><button class="sheet-close" id="sheetClose">×</button></div><p>Data sudah tersambung ke sistem utama. Untuk sementara transaksi <b>${esc(title)}</b> dilakukan melalui aplikasi utama agar pencatatan tetap aman.</p><div class="demo-box"><b>MODE HANYA BACA</b><br>Gunakan tombol di bawah jika perlu melakukan transaksi sekarang.</div><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="openProduction">Buka Aplikasi Utama</button></div></div></div>`;
    $('#sheetClose').onclick = closeSheet;
    $('#sheetCancel').onclick = closeSheet;
    $('#sheetBackdrop').onclick = e => { if (e.target.id === 'sheetBackdrop') closeSheet(); };
    $('#openProduction').onclick = () => {
      const url = String(config.APPS_SCRIPT_URL || '').trim();
      if (!bridge.validWebAppUrl(url)) return toast('Alamat aplikasi utama belum valid.');
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

    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Pemberitahuan"><div class="grabber"></div><div class="sheet-head"><h3>Pemberitahuan</h3><button class="sheet-close" id="sheetClose">×</button></div><div class="notice-section"><div class="notice-heading"><b>Bahan yang perlu dibelanja</b><span>${alerts.length} bahan</span></div><div class="notice-list">${stockHtml}</div></div>${other.length ? `<div class="notice-section"><div class="notice-heading"><b>Perlu perhatian</b><span>${other.length} pemberitahuan</span></div><div class="notice-list">${other.join('')}</div></div>` : ''}<div class="notice-summary">Daftar belanja mengikuti status stok <b>Kritis</b> dan <b>Menipis</b> dari sistem gudang. Nama bahan dan jumlah stok ditampilkan langsung agar Admin bisa menindaklanjuti tanpa menebak itemnya.</div></div></div>`;
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

  async function loadAppWithToken(token, silent = false) {
    try {
      const data = await bridge.call('getAppData', token);
      state.token = token;
      state.data = data;
      localStorage.setItem(TOKEN_KEY, token);
      $('#loginView').classList.add('is-hidden');
      $('#mainView').classList.remove('is-hidden');
      $('#profileBtn').textContent = initials(data.user && data.user.name || 'WW');
      updateNotificationBadge();
      setPage(activePage);
      if (!silent) toast('Sistem siap digunakan.');
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
      const pub = await bridge.call('getPublicState');
      state.publicState = pub;
      setAuthStatus(true);
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
  $('#notifyBtn').addEventListener('click', openNotifications);
  $('#profileBtn').addEventListener('click', () => {
    const d = state.data || {};
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet"><div class="grabber"></div><div class="sheet-head"><h3>Profil</h3><button class="sheet-close" id="sheetClose">×</button></div><p><b>${esc(d.user && d.user.name || '')}</b><br>${esc(d.user && d.user.role || '')} · @${esc(d.user && d.user.username || '')}</p><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="logoutBtn">Logout</button></div></div></div>`;
    $('#sheetClose').onclick = closeSheet; $('#sheetCancel').onclick = closeSheet;
    $('#logoutBtn').onclick = async () => {
      try { if (state.token) await bridge.call('logoutWarehouse', state.token); } catch (_) {}
      localStorage.removeItem(TOKEN_KEY); state.token=''; state.data=null; updateNotificationBadge(); closeSheet();
      $('#mainView').classList.add('is-hidden'); $('#loginView').classList.remove('is-hidden');
      toast('Logout berhasil.');
    };
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=0.2.3', { updateViaCache: 'none' }).then(reg => reg.update()).catch(() => {}));
  }

  boot();
})();
