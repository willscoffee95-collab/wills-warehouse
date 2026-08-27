(() => {
  'use strict';

  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const config = window.WILLS_CONFIG || { MODE: 'demo' };

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

  const demo = {
    user: { name: 'Wilyanto', role: 'OWNER' },
    kpi: {
      stockValue: 'Rp10,8 jt',
      stockItems: '42 item',
      funds: 'Rp1,36 jt',
      receivable: 'Rp0',
      transit: '0 item'
    },
    stocks: [
      { code: 'B01', name: 'UHT', qty: 12, unit: 'pcs', status: 'Aman', type: 'Gudang' },
      { code: 'PK-MT20', name: 'Matcha Pack 20gr', qty: 49, unit: 'pack', status: 'Aman', type: 'Packed' },
      { code: 'PK-CK15', name: 'Coklat Pack 15gr', qty: 21, unit: 'pack', status: 'Menipis', type: 'Packed' },
      { code: 'RAW-MT', name: 'Powder Matcha Bulk', qty: 3.4, unit: 'kg', status: 'Aman', type: 'Bulk' },
      { code: 'CUP6', name: 'Cup Kertas 6oz', qty: 160, unit: 'pcs', status: 'Aman', type: 'Gudang' },
      { code: 'KLIP610', name: 'Plastik Klip 6x10', qty: 4, unit: 'pack', status: 'Menipis', type: 'Gudang' },
      { code: 'AAA', name: 'Baterai AAA', qty: 8, unit: 'pack', status: 'Aman', type: 'Gudang' }
    ],
    history: [
      { title: 'Batch Packing Matcha', meta: 'PACK-20260827-0001 · 49 pack', amount: '+49 pack', badge: 'POSTED', cls: 'ok', icon: 'pack' },
      { title: 'Surat Jalan Cipaisan', meta: 'SJ-20260827-0003 · diterima', amount: '1 UHT', badge: 'SELESAI', cls: 'ok', icon: 'truck' },
      { title: 'Belanja Bahan', meta: 'Supplier utama · Bank', amount: 'Rp5.899.000', badge: 'POSTED', cls: 'brand', icon: 'cart' },
      { title: 'Sinkron Harga Outlet', meta: 'Preview Terima Bahan', amount: 'Siap', badge: 'AMAN', cls: 'ok', icon: 'price' }
    ]
  };

  const pages = {
    home: renderHome,
    stock: renderStock,
    transactions: renderTransactions,
    history: renderHistory,
    control: renderControl
  };

  let activePage = 'home';
  let stockFilter = 'Semua';

  function rpFake(value) { return value; }
  function pageHead(title, subtitle, chip = 'Demo · Front-end only') {
    return `<div class="page-head"><div><h1>${title}</h1><p>${subtitle}</p></div><span class="sync-chip">${chip}</span></div>`;
  }

  function renderHome() {
    const d = demo;
    return `${pageHead(`Selamat malam, ${d.user.name}`, 'Pantau gudang tanpa membuka Google Sheet.', 'Sistem siap · demo')}
      <section class="hero">
        <div class="hero-kicker"><span class="pulse"></span>Warehouse Control Center</div>
        <h3>${d.kpi.stockValue}</h3>
        <p>Total nilai stok aktif · ${d.kpi.stockItems}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="purchase">+ Belanja Bahan</button>
          <button class="btn btn-soft" data-action="delivery">Buat Surat Jalan</button>
        </div>
      </section>

      <div class="kpi-grid">
        ${kpiCard('Dana Gudang', d.kpi.funds, 'Bank + Kas', 'good')}
        ${kpiCard('Piutang Outlet', d.kpi.receivable, 'Tidak ada jatuh tempo')}
        ${kpiCard('Transit', d.kpi.transit, 'Semua kiriman selesai', 'good')}
        ${kpiCard('Recovery', '0', 'Tidak ada proses nyangkut', 'good')}
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
        <div class="section-head"><h3>Aktivitas Terbaru</h3><span>Hari ini</span></div>
        <div class="list">${d.history.slice(0,3).map(historyCard).join('')}</div>
      </section>`;
  }

  function kpiCard(label, value, delta, cls='') {
    return `<div class="kpi"><small>${label}</small><strong>${value}</strong><span class="delta ${cls}">${delta}</span></div>`;
  }
  function quickCard(icon, title, desc, action) {
    return `<button class="quick-card" data-action="${action}"><span class="q-icon">${icons[icon]}</span><b>${title}</b><small>${desc}</small></button>`;
  }

  function renderStock() {
    return `${pageHead('Stok Gudang', 'Qty ditampilkan dalam unit fisik yang mudah dibaca.')}
      <div class="search-wrap">${icons.search}<input id="stockSearch" class="search" placeholder="Cari bahan atau kode..."></div>
      <div class="chips">${['Semua','Gudang','Bulk','Packed'].map(x=>`<button class="chip ${stockFilter===x?'is-active':''}" data-stock-filter="${x}">${x}</button>`).join('')}</div>
      <div id="stockRows" class="list">${stockRows(demo.stocks)}</div>`;
  }

  function stockRows(rows) {
    const filtered = stockFilter === 'Semua' ? rows : rows.filter(x => x.type === stockFilter);
    return filtered.map(x => `<div class="stock-row"><div><b>${x.name}</b><small>${x.code} · ${x.type} · <span class="badge ${x.status==='Aman'?'ok':'warn'}">${x.status}</span></small></div><div class="stock-qty"><strong>${x.qty}</strong><span>${x.unit}</span></div></div>`).join('') || '<div class="empty">Tidak ada bahan pada filter ini.</div>';
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
    return `${pageHead('Transaksi', 'Semua aksi operasional dari satu tempat.')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>`;
  }
  function moduleCard(icon,title,desc,action){return `<button class="module-card" data-action="${action}"><span class="module-icon">${icons[icon]}</span><span class="copy"><b>${title}</b><small>${desc}</small></span><span class="chev">›</span></button>`}

  function renderHistory() {
    return `${pageHead('Riwayat', 'Audit transaksi tanpa edit data secara langsung.')}
      <div class="search-wrap">${icons.search}<input id="historySearch" class="search" placeholder="Cari transaksi..."></div>
      <div id="historyRows" class="list">${demo.history.map(historyCard).join('')}</div>`;
  }
  function historyCard(x){return `<div class="list-card"><span class="list-icon">${icons[x.icon]||icons.clock}</span><div class="list-main"><b>${x.title}</b><small>${x.meta}</small></div><div class="list-side"><strong>${x.amount}</strong><small><span class="badge ${x.cls}">${x.badge}</span></small></div></div>`}

  function renderControl() {
    const modules = [
      ['price','Harga Internal Outlet','Preview & sync harga dari Terima Bahan','internalPrice'],
      ['box','Master Bahan Wills','Source Master + katalog Warehouse','materials'],
      ['user','User & Role','OWNER · ADMIN · GUDANG · FINANCE','users'],
      ['audit','Audit Sistem','Invariant, recovery, integritas ledger','audit'],
      ['warning','Recovery Queue','Pantau transaksi yang perlu recovery','recovery'],
      ['wallet','Saldo Awal','Opening Bank / Opening Cash','opening']
    ];
    return `${pageHead('Kontrol', 'Pengaturan dan audit khusus Owner / Admin.')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('')}</div>
      <section class="section"><div class="section-head"><h3>Status Shell</h3><span>${config.VERSION || 'v0.1.0'}</span></div>
        <div class="hero"><div class="hero-kicker"><span class="pulse"></span>GitHub Pages Ready</div><h3>Front-end terpisah</h3><p>Belum terhubung ke Apps Script produksi. Semua tombol transaksi saat ini hanya membuka prototype flow.</p><div class="mini-bars"><i style="height:32%"></i><i style="height:54%"></i><i style="height:44%"></i><i style="height:72%"></i><i style="height:88%"></i><i style="height:68%"></i><i style="height:96%"></i></div></div>
      </section>`;
  }

  function setPage(page) {
    if (!pages[page]) return;
    activePage = page;
    $('#content').innerHTML = pages[page]();
    $$('.nav-item').forEach(x => x.classList.toggle('is-active', x.dataset.page === page));
    bindPage();
    $('#content').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function bindPage() {
    $$('[data-action]').forEach(btn => btn.addEventListener('click', () => openDemoSheet(btn.dataset.action)));
    $$('[data-page-jump]').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.pageJump)));
    $$('[data-stock-filter]').forEach(btn => btn.addEventListener('click', () => { stockFilter = btn.dataset.stockFilter; setPage('stock'); }));
    const stockSearch = $('#stockSearch');
    if (stockSearch) stockSearch.addEventListener('input', () => {
      const q = stockSearch.value.trim().toLowerCase();
      const rows = demo.stocks.filter(x => `${x.code} ${x.name}`.toLowerCase().includes(q));
      $('#stockRows').innerHTML = stockRows(rows);
    });
    const historySearch = $('#historySearch');
    if (historySearch) historySearch.addEventListener('input', () => {
      const q = historySearch.value.trim().toLowerCase();
      $('#historyRows').innerHTML = demo.history.filter(x => `${x.title} ${x.meta} ${x.badge}`.toLowerCase().includes(q)).map(historyCard).join('') || '<div class="empty">Transaksi tidak ditemukan.</div>';
    });
  }

  const actionNames = {
    purchase:'Belanja Bahan', packing:'Batch Packing', delivery:'Surat Jalan', outletPayment:'Pembayaran Outlet', expense:'Pengeluaran Operasional', supplierPayment:'Bayar Supplier', adjustment:'Opname / Koreksi', packingWage:'Bayar Upah Packing', internalPrice:'Harga Internal Outlet', materials:'Master Bahan Wills', users:'User & Role', audit:'Audit Sistem', recovery:'Recovery Queue', opening:'Saldo Awal'
  };

  function openDemoSheet(action) {
    const title = actionNames[action] || 'Modul';
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="sheet-backdrop" id="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="grabber"></div><div class="sheet-head"><h3>${title}</h3><button class="sheet-close" id="sheetClose">×</button></div><p>Ini adalah cangkang tampilan untuk modul <b>${title}</b>. Layout, navigasi, bottom sheet, state visual, dan PWA shell sudah siap dipreview di GitHub Pages.</p><div class="demo-box"><b>AMAN UNTUK PREVIEW</b><br>Mode ini tidak menjalankan transaksi, tidak menulis Google Sheet, tidak mengurangi stok, dan tidak memanggil backend Apps Script produksi.</div><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="sheetPrototype">Lihat Prototype</button></div></div></div>`;
    $('#sheetClose').onclick = closeSheet;
    $('#sheetCancel').onclick = closeSheet;
    $('#sheetBackdrop').onclick = e => { if (e.target.id === 'sheetBackdrop') closeSheet(); };
    $('#sheetPrototype').onclick = () => toast(`${title}: endpoint backend belum dihubungkan.`);
  }
  function closeSheet(){ $('#sheetRoot').innerHTML = ''; }

  function toast(message) {
    const root = $('#toastRoot');
    root.innerHTML = `<div class="toast">${message}</div>`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => root.innerHTML = '', 2600);
  }

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    $('#loginView').classList.add('is-hidden');
    $('#mainView').classList.remove('is-hidden');
    setPage('home');
    toast('Mode demo aktif · backend produksi tidak tersentuh.');
  });
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.page)));
  $('#notifyBtn').addEventListener('click', () => toast('2 notifikasi demo: stok menipis & upah packing.'));
  $('#profileBtn').addEventListener('click', () => openDemoSheet('users'));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
