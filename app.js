(() => {
  'use strict';
  window.WW_FRONTEND_BUILD='2026-11-07.1.5.2.16-so-fisik-0811';


  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const config = window.WILLS_CONFIG || { MODE: 'live' };
  const bridge = window.WILLS_BRIDGE;
  const TOKEN_KEY = 'ww_github_token_v1';
  const BOOT_SNAPSHOT_KEY = 'ww_github_bootstrap_v1521';
  const BOOT_SNAPSHOT_MAX_AGE = 21600000; // 6 jam; stale snapshot hanya untuk render cepat, server tetap revalidate.


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
    moduleReady: Object.create(null),
    modulePromises: Object.create(null)
  };
  function tokenSigV1360(token){return String(token||'').slice(-16);}
  function readBootstrapSnapshotV1360(token){
    try{const x=JSON.parse(localStorage.getItem(BOOT_SNAPSHOT_KEY)||'null');if(!x||x.sig!==tokenSigV1360(token)||!x.data)return null;if(Date.now()-Number(x.at||0)>BOOT_SNAPSHOT_MAX_AGE)return null;return x.data;}catch(e){return null;}
  }
  function writeBootstrapSnapshotV1360(token,data){
    if(!token||!data||!data.user)return;try{localStorage.setItem(BOOT_SNAPSHOT_KEY,JSON.stringify({at:Date.now(),sig:tokenSigV1360(token),data:data}));}catch(e){}
  }
  function clearBootstrapSnapshotV1360(){try{localStorage.removeItem(BOOT_SNAPSHOT_KEY);}catch(e){}}
  function normalizeShellDataV1360(shell,existing){
    const base=existing&&typeof existing==='object'?existing:{};
    return {...base,...shell,dashboard:base.dashboard||{},materials:base.materials||[],stock:base.stock||[],incomingRequests:base.incomingRequests||[],deliveries:base.deliveries||[],history:base.history||[],controls:base.controls||{}};
  }
  function applyAppDataV1360(token,data,fromCache){
    state.token=token;state.data=normalizeShellDataV1360(data,state.data);localStorage.setItem(TOKEN_KEY,token);
    $('#loginView').classList.add('is-hidden');$('#mainView').classList.remove('is-hidden');
    $('#profileBtn').textContent=initials((state.data.user&&state.data.user.name)||'WW');
    updateNotificationBadge();setPage('home',{pushHistory:false});if(!appHistoryReady)initAppHistory();
    if(Array.isArray(data.stock)) window.dispatchEvent(new CustomEvent('wills:stock-v41',{detail:{stock:state.data.stock||[],userId:state.data.user&&state.data.user.id||'default',stale:!!fromCache}}));
    if(fromCache){const c=$('#content');if(c)c.dataset.fastSnapshot='1';}
  }
  function isSessionErrorV1360(err){const m=String(err&&err.message||err||'').toLowerCase();return m.includes('sesi')||m.includes('login kembali')||m.includes('user tidak aktif');}
  function invalidateSessionV1360(message){
    localStorage.removeItem(TOKEN_KEY);clearBootstrapSnapshotV1360();state.token='';state.data=null;state.moduleReady=Object.create(null);state.modulePromises=Object.create(null);resetSheetNavigation();appHistoryReady=false;
    $('#mainView').classList.add('is-hidden');$('#loginView').classList.remove('is-hidden');if(message)toast(message,'warning');
  }


  let activePage = 'home';
  let stockFilter = 'Gudang';
  let historyCategoryFilter = 'Semua';
  let historyDateFilter = 'ALL';
  let historyExactDate = '';
  let featureOpening = false;
  let busyDepth = 0;
  let toastShowing = false;
  const toastQueue = [];
  let appHistoryReady = false;
  let sheetHistoryDepth = 0;
  const sheetViewStack = [];
  let pendingAfterSheetBack = null;
  let lastBackAt = 0;


  // v1.3.5 — canonical PWA retains Warehouse/HPP/SJ invariants; adds actual outlet receipt dates to SJ detail/thermal while preserving layered Android Back navigation.
  const ROLE_LABELS = Object.freeze({
    OWNER:'Owner', ADMIN:'Admin Legacy', ADMIN_1:'Admin 1 Finance', ADMIN_2:'Admin 2 Staff Gudang',
    STAFF_GUDANG:'Staff Gudang Legacy', STAFF_LOGISTIK:'Staff Logistik', FINANCE:'Finance'
  });
  const ROLE_PERMISSIONS = Object.freeze({
    OWNER:['*'],
    ADMIN:['PURCHASE','PACKING','EXPENSE','SUPPLIER_MASTER','INTERNAL_PRICE','REQUEST_SYNC','DELIVERY_CREATE','DELIVERY_CANCEL','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DELIVERY_COMPLETE','OUTLET_PAYMENT','AUDIT_OPERATIONAL','FINANCE_REPORT','DISPATCH_REPORT'],
    ADMIN_1:['PURCHASE','PACKING','EXPENSE','SUPPLIER_MASTER','INTERNAL_PRICE','CENTRAL_PRICE','OUTLET_PAYMENT','SUPPLIER_PAYMENT','PACKING_WAGE_PAYMENT','AUDIT_OPERATIONAL','FINANCE_REPORT','DISPATCH_REPORT'],
    ADMIN_2:['REQUEST_SYNC','DELIVERY_CREATE','DELIVERY_CANCEL','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DELIVERY_COMPLETE','AUDIT_OPERATIONAL','DISPATCH_REPORT'],
    STAFF_GUDANG:['PACKING','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DISPATCH_REPORT'],
    STAFF_LOGISTIK:['PACKING','DELIVERY_PREPARE','DELIVERY_DISPATCH','DELIVERY_SYNC','DISPATCH_REPORT'],
    FINANCE:['EXPENSE','OUTLET_PAYMENT','SUPPLIER_PAYMENT','PACKING_WAGE_PAYMENT','DELIVERY_SYNC','DELIVERY_COMPLETE','FINANCE_REPORT','DISPATCH_REPORT']
  });
  const ACTION_PERMISSION = Object.freeze({
    purchase:'PURCHASE', packing:'PACKING', delivery:'DELIVERY_PREPARE', draftPrint:'DELIVERY_PREPARE',
    outletPayment:'OUTLET_PAYMENT', expense:'EXPENSE', supplierPayment:'SUPPLIER_PAYMENT', adjustment:'OWNER_ONLY',
    packingWage:'PACKING_WAGE_PAYMENT', internalPrice:'INTERNAL_PRICE', centralPrice:'CENTRAL_PRICE', users:'OWNER_ONLY', audit:'AUDIT_OPERATIONAL',
    recovery:'AUDIT_OPERATIONAL', financeActual:'FINANCE_REPORT', stockReport:'FINANCE_REPORT', dispatchRecap:'DISPATCH_REPORT', materials:'ANY', hppCorrection:'OWNER_ONLY'
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
  // Fail-closed while the login/bootstrap shell has not yet supplied the new-mode flag.
  // Prevent stale finance cards/actions from flashing during login.
  const inventoryOnlyV1520=()=>((state.data||{}).inventoryOnlyV1520)!==false;
  const moneyActionsV1520=['outletPayment','expense','supplierPayment','packingWage','financeActual'];
  function actionAllowed(action){
    if(inventoryOnlyV1520()&&moneyActionsV1520.includes(action))return false;
    if(action==='offlineSjValue')return ((state.data||{}).inventoryOnlyV1520)===true&&roleCan('DISPATCH_REPORT');
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
    FINANCE_POSITION_ADJUSTMENT: ['Penyesuaian Posisi Dana','money'],
    DELIVERY_FULFILLMENT_ADJUSTMENT: ['Penyesuaian Pemenuhan Surat Jalan','truck'],
    HPP_HISTORICAL_CORRECTION: ['Koreksi HPP Historis','audit'],
    STOCK_ADJUSTMENT: ['Opname / Koreksi','audit'],
    OPENING_STOCK: ['Saldo Awal Stok','box'],
    OPENING_BANK: ['Saldo Awal Bank','wallet'],
    OPENING_BANK_ADJUSTMENT: ['Koreksi Saldo Awal Bank','wallet'],
    OPENING_CASH: ['Saldo Awal Kas','wallet'],
    OPENING_CASH_ADJUSTMENT: ['Koreksi Saldo Awal Kas','wallet'],
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
      POSTING:'DIPROSES', PENDING:'MENUNGGU', CANCELLED:'DIBATALKAN', CANCELED:'DIBATALKAN', DITERIMA:'DIPROSES OTOMATIS'
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
    if (s === 'DITERIMA') return 'warn';
    if (s === 'SELISIH') return 'bad';
    return 'brand';
  }
  function deliveryStatusBadge(status) {
    return `<span class="badge ${deliveryStatusClass(status)}">${esc(statusLabel(status).toUpperCase())}</span>`;
  }


  const HISTORY_CATEGORIES = Object.freeze({
    PURCHASE:'Pembelian', SUPPLIER_PAYMENT:'Keuangan', OPERATIONAL_EXPENSE:'Keuangan', OUTLET_PAYMENT:'Keuangan', OUTLET_RECEIVABLE:'Keuangan', PACKING_WAGE_PAYMENT:'Keuangan', FINANCE_POSITION_ADJUSTMENT:'Keuangan',
    DISTRIBUTION_DISPATCH:'Pengiriman', DELIVERY_FULFILLMENT_ADJUSTMENT:'Pengiriman', PACKING_BATCH:'Produksi / Packing', HPP_HISTORICAL_CORRECTION:'Stok / Koreksi', STOCK_ADJUSTMENT:'Stok / Koreksi', OPENING_STOCK:'Stok / Koreksi', OPENING_BANK:'Keuangan', OPENING_BANK_ADJUSTMENT:'Keuangan', OPENING_CASH:'Keuangan', OPENING_CASH_ADJUSTMENT:'Keuangan', REVERSAL:'Stok / Koreksi',
    INTERNAL_PRICE_UPDATE:'Master / Sistem', INTERNAL_PRICE_BULK_SYNC:'Master / Sistem', MASTER_SUPPLIER:'Master / Sistem', SOURCE_MASTER_CONFIG:'Master / Sistem', SOURCE_MASTER_SYNC:'Master / Sistem'
  });
  function historyCategory(type){return HISTORY_CATEGORIES[String(type||'').toUpperCase()]||'Lainnya';}
  function parseLocalDateTime(v){const x=String(v||'').trim();if(!x)return null;const d=new Date(x.replace(' ','T'));return isNaN(d.getTime())?null:d;}
  function parseDisplayDate(v){const x=String(v||'').trim();if(!x)return null;const iso=x.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);if(iso){const d=new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]),12,0,0);return isNaN(d.getTime())?null:d;}return parseLocalDateTime(x);}
  function displayDateShort(v){const d=parseDisplayDate(v);return d?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(d).replaceAll('.',''):String(v||'-');}
  function displayDateTimeShort(v){const d=parseLocalDateTime(v);if(!d)return displayDateShort(v);const date=new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(d).replaceAll('.','');const time=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace('.',':');return date+' · '+time+' WIB';}
  function historyDateLabel(x){const d=parseLocalDateTime(x.time);return d?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(d).replaceAll('.',''):(x.date||'-');}
  function historyTimeLabel(x){const d=parseLocalDateTime(x.time);return d?new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace('.',':'):'';}
  function historyMatchesDate(x){
    if(historyExactDate)return String(x.date||'')===historyExactDate;
    if(historyDateFilter==='ALL')return true;
    const d=parseLocalDateTime(x.time);if(!d)return false;const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if(historyDateFilter==='TODAY')return d>=start;
    if(historyDateFilter==='YESTERDAY'){const a=new Date(start);a.setDate(a.getDate()-1);return d>=a&&d<start;}
    if(historyDateFilter==='7D'){const a=new Date(start);a.setDate(a.getDate()-6);return d>=a;}
    if(historyDateFilter==='MONTH')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
    return true;
  }
  function liveHistory() {
    if (!state.data) return [];
    const source = state.data.history || ((state.data.dashboard||{}).recent) || [];
    return source.map(x => {
      const meta = TX_META[x.type] || [String(x.type || 'Transaksi').replaceAll('_',' '), 'clock'];
      const amount = Number(x.total || 0) ? rp(x.total) : (x.invoiceNo || '');
      const st = String(x.status || ''),category=historyCategory(x.type),dateLabel=historyDateLabel(x),timeLabel=historyTimeLabel(x);
      return {txnId:x.txnId,type:x.type||'',time:x.time||'',date:x.date||'',dateLabel,timeLabel,category,title:meta[0],meta:[dateLabel+(timeLabel?' · '+timeLabel+' WIB':''),category,x.supplier||'',x.invoiceNo?('Ref '+x.invoiceNo):'',x.user?('oleh '+x.user):''].filter(Boolean).join(' · '),detailId:x.txnId?('ID '+x.txnId):'',amount,badge:statusLabel(st),cls:st==='POSTED'?'ok':st==='REVERSED'?'warn':st==='FAILED'?'bad':'brand',icon:meta[1]};
    });
  }
  function filteredHistoryRows(){return liveHistory().filter(x=>(historyCategoryFilter==='Semua'||x.category===historyCategoryFilter)&&historyMatchesDate(x));}
  function historyRowsHtml(rows){if(!rows.length)return '<div class="empty">Transaksi tidak ditemukan pada filter ini.</div>';let last='',html='';rows.forEach(x=>{if(x.dateLabel!==last){last=x.dateLabel;html+=`<div class="history-date-group"><b>${esc(x.dateLabel)}</b><span>${esc(x.date||'')}</span></div>`;}html+=historyCard(x);});return html;}




  // v4.2: visual parity with production Apps Script Dashboard; no transaction changes.
  function renderHome() {
    const d=state.data||{}, dash=d.dashboard||{};
    const role=currentRole(), finance=!inventoryOnlyV1520()&&dash.financeVisible!==false;
    const draftCount=wwDraftSjCountV15211(d.deliveries);
    const bootstrapReady=Object.prototype.hasOwnProperty.call(dash,'activeMaterials');
    const openReq=Array.isArray(d.deliveries)?draftCount:null;
    const cashReady=dash.financeUnit&&dash.financeUnit.ready;
    const money=v=>v==null?'—':rp(v);
    const qty=v=>v==null?'—':num(v,0);
    const kpis=finance?[
      kpiCard(cashReady?'Saldo Unit Gudang':'Saldo Gudang',money(cashReady?dash.financeUnit.balance:dash.warehouseFunds),
        'Dana fisik '+money(dash.warehouseFunds)+' · Bank '+money(dash.bankBalance)+' · Kas '+money(dash.cashBalance)),
      kpiCard('Piutang Outlet',money(dash.receivablesTotal),qty(dash.receivablesCount)+' tagihan aktif'),
      kpiCard('Nilai Stok',money(dash.stockValue),''),
      kpiCard('Dalam Transit',money(dash.transitValue),qty(dash.transitLines)+' baris aktif')
    ].join(''):[
      kpiCard('Bahan Aktif',qty(dash.activeMaterials),'Stok fisik Warehouse'),
      kpiCard('Harus Dikirim',qty(openReq),'SJ DRAFT menunggu pengiriman'),
      kpiCard('Dalam Pengiriman',qty(dash.transitLines)+' baris','Status transit'),
      kpiCard('Pemulihan',qty(dash.recoveryPending),Number(dash.recoveryPending||0)?'Perlu perhatian':'Tidak ada proses tertunda')
    ].join('');
    const quick=[];
    if(roleCan('PACKING')) quick.push(quickCard('pack','Batch Packing','Bahan curah → hasil packing','packing'));
    if(actionAllowed('delivery')) quick.push(quickCard('truck','Bahan yang Harus Dikirim','Siapkan bahan outlet','delivery'));
    if(actionAllowed('delivery')) quick.push(quickCard('truck','Surat Jalan','Siapkan • cetak • kirim','delivery'));
    if(actionAllowed('draftPrint')&&draftCount) quick.push(quickCard('printer','Draft Siap Kirim','Cetak thermal Bluetooth','draftPrint'));
    if(roleCan('PURCHASE')) quick.push(quickCard('cart','Belanja Bahan',inventoryOnlyV1520()?'Barang masuk · biaya & HPP':'Bank / Kas / Tempo','purchase'));
    if(actionAllowed('outletPayment')) quick.push(quickCard('money','Pembayaran Outlet','Catat pembayaran outlet','outletPayment'));
    if(actionAllowed('packingWage')&&Number(dash.packingWageOutstanding||0)>0) quick.push(quickCard('money','Bayar Upah Packing','Pelunasan upah batch','packingWage'));
    if(actionAllowed('supplierPayment')) quick.push(quickCard('wallet','Bayar Supplier','Bank / Kas Gudang','supplierPayment'));
    if(actionAllowed('expense')) quick.push(quickCard('expense','Pengeluaran','Operasional gudang','expense'));
    return `<section class="hero ww-as-home-hero">
      <div class="hero-kicker">WILLS COFFEE · ${esc(roleName(role))}</div>
      <h3>${esc(d.warehouseName||'Wills Warehouse')}</h3>
      ${!bootstrapReady?'<p class="ww-as-loading" role="status"><span class="ww-spin-v1526" aria-hidden="true"></span>Data operasional sedang dimuat…</p>':''}
      ${Number(dash.recoveryPending||0)>0?'<p class="ww-as-warning">⚠ '+num(dash.recoveryPending,0)+' transaksi dalam antrean pemulihan.</p>':''}
    </section>
    <div class="kpi-grid ww-as-kpi-grid">${kpis}</div>
    ${quick.length?`<section class="section ww-as-actions"><div class="section-head"><h3>Aksi cepat</h3></div><div class="quick-grid">${quick.join('')}</div></section>`:''}`;
  }

  function kpiCard(label, value, delta, cls='') {
    return `<div class="kpi"><small>${esc(label)}</small><strong>${esc(value)}</strong><span class="delta ${cls}">${esc(delta)}</span></div>`;
  }
  function quickCard(icon, title, desc, action) {
    return `<button class="quick-card" data-action="${action}"><span class="q-icon">${icons[icon]}</span><b>${esc(title)}</b><small>${esc(desc)}</small></button>`;
  }


  function renderStock() {
    const groups=['Gudang','Curah','Hasil Packing'],stocks=liveStocks();
    const iconsByType={'Gudang':icons.box,'Curah':icons.cart,'Hasil Packing':icons.pack};
    const cards=groups.map(type=>{
      const rows=stocks.filter(x=>x.type===type),critical=rows.filter(x=>x.status!=='Aman').length;
      return '<button type="button" class="ww-stock-group '+(stockFilter===type?'is-active':'')+'" data-stock-filter="'+esc(type)+'" aria-pressed="'+(stockFilter===type)+'">'+
        '<span class="ww-stock-group-icon">'+iconsByType[type]+'</span><span class="ww-stock-group-label">'+esc(type)+'</span>'+
        '<span class="ww-stock-group-count">'+num(rows.length,0)+' bahan'+(critical?' · '+num(critical,0)+' perlu cek':'')+'</span></button>';
    }).join('');
    return pageHead('Stok Gudang','Pilih kelompok bahan untuk memantau stok tanpa menggulir daftar panjang.')+
      '<div class="ww-stock-groups">'+cards+'</div>'+
      '<div class="search-wrap">'+icons.search+'<input id="stockSearch" class="search" placeholder="Cari di '+esc(stockFilter)+'..." aria-label="Cari bahan"></div>'+
      '<div class="ww-stock-list-head"><b>'+esc(stockFilter)+'</b><span>'+num(stocks.filter(x=>x.type===stockFilter).length,0)+' bahan</span></div>'+
      '<div id="stockRows" class="ww-stock-tile-grid" aria-live="polite">'+stockRows(stocks)+'</div>';
  }
  function stockRows(rows) {
    const filtered=rows.filter(x=>x.type===stockFilter),ico=stockFilter==='Hasil Packing'?icons.pack:stockFilter==='Curah'?icons.cart:icons.box;
    return filtered.map(x=>
      '<div class="ww-stock-tile"><span class="ww-stock-tile-icon">'+ico+'</span><div class="ww-stock-tile-main"><b>'+esc(x.name)+'</b>'+
      '<small>'+esc(x.code)+'</small><strong>'+num(x.qty)+' <span>'+esc(x.unit)+'</span></strong></div>'+
      '<span class="badge '+(x.status==='Aman'?'ok':x.status==='Menipis'?'warn':'bad')+'">'+esc(x.status)+'</span></div>'
    ).join('')||'<div class="empty">Tidak ada bahan pada kelompok ini.</div>';
  }

  function renderTransactions() {
    const all = [
      ['cart','Belanja Bahan',inventoryOnlyV1520()?'Barang masuk · biaya & HPP':'Lunas / Tempo · Kas / Bank','purchase'],
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
    return `${pageHead('Transaksi', 'Menu sesuai hak akses dan otomatis tersambung ke backend.', 'Siap transaksi')}
      <div class="module-grid">${modules.map(m=>moduleCard(...m)).join('') || '<div class="empty">Tidak ada transaksi untuk role ini.</div>'}</div>`;
  }
  function moduleCard(icon,title,desc,action){return `<button class="module-card" data-action="${action}"><span class="module-icon">${icons[icon]}</span><span class="copy"><b>${esc(title)}</b><small>${esc(desc)}</small></span><span class="chev">›</span></button>`}


  function renderHistory() {
    const rows = filteredHistoryRows(),cats=['Semua','Pembelian','Pengiriman','Produksi / Packing','Keuangan','Stok / Koreksi','Master / Sistem','Lainnya'];
    return `${pageHead('Riwayat', 'Cek transaksi berdasarkan tanggal dan kategori. Kode transaksi tetap tersedia sebagai referensi kecil.')}
      <div class="history-filter-box">
        <div class="search-wrap">${icons.search}<input id="historySearch" class="search" placeholder="Cari transaksi, outlet, supplier, atau ID..."></div>
        <div class="chips">${cats.map(x=>`<button class="chip ${historyCategoryFilter===x?'is-active':''}" data-history-category="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <div class="form-2 history-date-controls"><label class="field"><span>Periode cepat</span><select id="historyDatePreset"><option value="ALL" ${historyDateFilter==='ALL'?'selected':''}>Semua tanggal</option><option value="TODAY" ${historyDateFilter==='TODAY'?'selected':''}>Hari ini</option><option value="YESTERDAY" ${historyDateFilter==='YESTERDAY'?'selected':''}>Kemarin</option><option value="7D" ${historyDateFilter==='7D'?'selected':''}>7 hari terakhir</option><option value="MONTH" ${historyDateFilter==='MONTH'?'selected':''}>Bulan ini</option></select></label><label class="field"><span>Pilih tanggal tertentu</span><input id="historyExactDate" type="date" value="${esc(historyExactDate)}"></label></div>
      </div>
      <div id="historyRows" class="list history-list">${historyRowsHtml(rows)}</div>`;
  }
  function historyCard(x){const canRev=((state.data||{}).user||{}).role==='OWNER'&&x.badge==='SELESAI';return `<div class="list-card history-card"><span class="list-icon">${icons[x.icon]||icons.clock}</span><div class="list-main"><div class="history-card-top"><b>${esc(x.title)}</b><span class="history-time">${esc(x.timeLabel?x.timeLabel+' WIB':'')}</span></div><small>${esc(x.meta)}</small>${x.detailId?`<small class="history-id">${esc(x.detailId)}</small>`:''}</div><div class="list-side"><strong>${esc(x.amount)}</strong><small><span class="badge ${x.cls}">${esc(x.badge)}</span></small>${canRev?`<button class="history-reverse" data-reverse-txn="${esc(x.txnId)}">Batalkan</button>`:''}</div></div>`}




  function renderControl() {
    const d = state.data || {};
    const all = [
      ['price','Pusat Harga Bahan','Default pusat · override outlet · histori harga','centralPrice'],
      ['price','Harga Internal Outlet','Validasi sumber Terima Bahan / Master outlet','internalPrice'],
      ['box','Master Bahan Wills','Katalog bahan gudang','materials'],
      ['user','Pengguna & Peran','Owner · Admin 1 Finance · Admin 2 Staff Gudang','users'],
      ['audit','Audit Sistem','Pemeriksaan integritas dan keamanan transaksi','audit'],
      ['warning','Antrean Pemulihan','Pantau transaksi yang perlu dipulihkan','recovery'],
      ['money','Posisi Dana Warehouse','Atur saldo Bank & Kas yang benar sekarang','financeActual'],
      ['clipboard','Laporan Stok Warehouse','Mingguan / bulanan · pembelian & distribusi outlet','stockReport'],
      ['truck','Rekap Pengiriman Outlet','Per tanggal · per outlet · per bahan yang benar-benar dikirim','dispatchRecap'],
      ['truck','Nilai Bahan Outlet (Offline)','Nilai kirim & terima dari harga snapshot SJ · tanpa status pembayaran','offlineSjValue'],
      ['audit','Koreksi HPP Historis','Perbaiki cost lama tanpa mengubah qty stok','hppCorrection']
    ];
    const modules=visibleModuleRows(all);
    const role=currentRole();
    const guide=inventoryOnlyV1520()?
      '<div class="ww-as-role-guide"><b>Pembagian tugas · Inventory Only</b><br>'+
      'Admin 1 — belanja bahan, packing, supplier dan harga/HPP. Pembayaran dilakukan di luar Warehouse.<br>'+
      'Admin 2 — permintaan outlet, penyiapan bahan, Surat Jalan dan pengiriman.<br>'+
      'Owner — koreksi stok, akun dan audit sistem. Ledger keuangan lama tetap dikarantina.</div>':
      '<div class="ww-as-role-guide"><b>Pembagian tugas:</b><br>'+
      'Admin 1 Finance — belanja/pemasukan, pengeluaran, pembayaran, supplier & kontrol harga; tanpa koreksi stok.<br>'+
      'Admin 2 Staff Gudang — permintaan outlet, siapkan bahan, Surat Jalan dan pengiriman.<br>'+
      'Owner — satu-satunya role untuk koreksi stok, koreksi saldo, dan pemeriksaan seluruh sistem.</div>';
    return `${pageHead('Kontrol', 'Owner · hak akses dipisahkan di backend.', 'Sistem aktif')}${guide}
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
    if(page==='history'){
      beginBusy('Memuat riwayat…');
      try{await ensureModule('history');}catch(e){toast(e.message);return;}finally{endBusy();}
    } else if(page==='stock' && !(state.data.stock&&state.data.materials)){
      beginBusy('Memuat stok…');
      try{await ensureModule('stock');}catch(e){toast(e.message);return;}finally{endBusy();}
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
    $$('[data-history-category]').forEach(btn=>btn.addEventListener('click',()=>{historyCategoryFilter=btn.dataset.historyCategory||'Semua';setPage('history',{pushHistory:false});}));
    const historyDatePreset=$('#historyDatePreset');if(historyDatePreset)historyDatePreset.addEventListener('change',()=>{historyDateFilter=historyDatePreset.value||'ALL';historyExactDate='';setPage('history',{pushHistory:false});});
    const historyExact=$('#historyExactDate');if(historyExact)historyExact.addEventListener('change',()=>{historyExactDate=historyExact.value||'';if(historyExactDate)historyDateFilter='ALL';setPage('history',{pushHistory:false});});
    const historySearch = $('#historySearch');
    if (historySearch) historySearch.addEventListener('input', () => {
      const q = historySearch.value.trim().toLowerCase();
      const rows = filteredHistoryRows().filter(x => `${x.title} ${x.meta} ${x.detailId} ${x.badge} ${x.category}`.toLowerCase().includes(q));
      $('#historyRows').innerHTML = historyRowsHtml(rows);
      $$('[data-reverse-txn]').forEach(btn=>btn.addEventListener('click',()=>directReverse(btn.dataset.reverseTxn)));
    });
  }


  const actionNames = {
    purchase:'Belanja Bahan', packing:'Batch Packing', delivery:'Bahan yang Harus Dikirim Sekarang / Surat Jalan', draftPrint:'Draft Siap Kirim / Cetak Thermal', outletPayment:'Pembayaran Outlet', expense:'Pengeluaran Operasional', supplierPayment:'Bayar Supplier', adjustment:'Opname / Koreksi', packingWage:'Bayar Upah Packing', internalPrice:'Harga Internal Outlet', materials:'Master Bahan Wills', users:'Pengguna & Peran', audit:'Audit Sistem', recovery:'Antrean Pemulihan', financeActual:'Posisi Dana Warehouse', stockReport:'Laporan Stok Warehouse', dispatchRecap:'Rekap Pengiriman Outlet', hppCorrection:'Koreksi HPP Historis', centralPrice:'Pusat Harga Bahan'
  };


  const ACTION_DATA_MODULE = Object.freeze({
    purchase:'purchase', packing:'packing', delivery:'delivery', draftPrint:'delivery',
    outletPayment:'receivables', expense:'expense', supplierPayment:'payables', adjustment:'stock',
    packingWage:'packingwage', users:'users', materials:'stock', dispatchRecap:'dispatchreport', hppCorrection:'stock'
  });
  async function ensureModule(name, force=false){
    name=String(name||'').toLowerCase(); if(!name)return state.data;
    if(!force && state.moduleReady[name])return state.data;
    if(!force && state.modulePromises[name])return state.modulePromises[name];
    const p=bridge.call('getAppModule',state.token,name).then(data=>{
      Object.assign(state.data,data||{}); state.moduleReady[name]=true; delete state.modulePromises[name];
      updateNotificationBadge(); return state.data;
    }).catch(err=>{delete state.modulePromises[name];throw err});
    state.modulePromises[name]=p; return p;
  }
  function invalidateDataModules(){state.moduleReady=Object.create(null);state.modulePromises=Object.create(null);}
  async function refreshBootstrapLight(){
    const data=await bridge.call('getAppBootstrap',state.token);
    state.data={...(state.data||{}),...data}; state.moduleReady.stock=true; writeBootstrapSnapshotV1360(state.token,state.data);
    updateNotificationBadge();
    if(Array.isArray(data.stock)) window.dispatchEvent(new CustomEvent('wills:stock-v41',{detail:{stock:data.stock,userId:state.data.user&&state.data.user.id||'default',stale:false}}));
    if(activePage==='home'||activePage==='stock'){const c=$('#content');if(c){c.innerHTML=pages[activePage]();bindPage();}}
    return state.data;
  }


  // v4.3: update lightweight dashboard only when staff return to the app.
  // Never automatically sync remote requests, post payments or touch the ledger.
  let opsV43LastResumeRefresh=0;
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible'||!state.token||!state.bridgeReady||busyDepth>0)return;
    if(!$('#mainView')||$('#mainView').classList.contains('is-hidden'))return;
    if($('#sheetRoot')&&$('#sheetRoot').children.length)return;
    const now=Date.now();if(now-opsV43LastResumeRefresh<90000)return;
    opsV43LastResumeRefresh=now;
    refreshBootstrapLight().catch(err=>console.warn('[Wills Warehouse] refresh saat kembali:',err&&err.message||err));
  });

  async function openFeatureOneTap(action, trigger) {
    if (!state.bridgeReady) return toast('Sedang menyambungkan data terbaru…','warning');
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
      const moduleName=ACTION_DATA_MODULE[action]||'';
      if(moduleName)await ensureModule(moduleName,action==='delivery');
      if(action==='delivery')wwSelectedOutletV1522='ALL';
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


  function currentSheetNode(){return $('#sheetRoot')&&$('#sheetRoot').firstElementChild;}
  function currentSheetKey(){const n=currentSheetNode();return n?String(n.dataset.sheetKey||''):'';}
  function pushSheetHistory() {
    if (!appHistoryReady) return;
    sheetHistoryDepth += 1;
    history.pushState({ willsWarehouse: true, page: activePage, sheet: true, sheetDepth: sheetHistoryDepth }, document.title);
    lastBackAt = 0;
  }
  function resetSheetNavigation(){
    const root=$('#sheetRoot');if(root)root.innerHTML='';
    sheetViewStack.splice(0,sheetViewStack.length);sheetHistoryDepth=0;pendingAfterSheetBack=null;
  }
  function restorePreviousSheetLayer(event){
    const root=$('#sheetRoot');if(!root)return;
    root.innerHTML='';
    if(sheetViewStack.length){
      root.appendChild(sheetViewStack.pop());
      const depth=Number(event&&event.state&&event.state.sheetDepth||0);
      sheetHistoryDepth=depth>0?depth:Math.max(1,sheetViewStack.length+1);
    }else sheetHistoryDepth=0;
    const after=pendingAfterSheetBack;pendingAfterSheetBack=null;
    if(after)queueMicrotask(()=>{try{after();}catch(e){console.warn('[Wills Warehouse] after back:',e.message);}});
  }
  function sheetHtml(title, body, options = {}) {
    const root=$('#sheetRoot'),key=String(options.key||title||'sheet'),current=root.firstElementChild;
    const replaceCurrent=options.replaceCurrent===true||(current&&String(current.dataset.sheetKey||'')===key);
    if(current&&!replaceCurrent){sheetViewStack.push(current);root.removeChild(current);}else if(current)root.innerHTML='';
    root.insertAdjacentHTML('beforeend',`<div class="sheet-backdrop" id="sheetBackdrop" data-sheet-key="${esc(key)}"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grabber"></div><div class="sheet-head"><h3>${esc(title)}</h3><button class="sheet-close" id="sheetClose">×</button></div>${body}</div></div>`);
    if(!replaceCurrent)pushSheetHistory();
    $('#sheetClose').onclick=closeSheet; $('#sheetBackdrop').onclick=e=>{if(e.target.id==='sheetBackdrop')closeSheet()};
  }
  function idemKey(action){const k='ww_gh_idem_'+action;let x;try{x=JSON.parse(localStorage.getItem(k)||'null')}catch(_){x=null}if(x&&Date.now()-x.ts<86400000)return x.id;const id=action+':'+Date.now()+':'+Math.random().toString(36).slice(2);localStorage.setItem(k,JSON.stringify({id,ts:Date.now()}));return id}
  const opsWriteInFlightV43=new Set();
  async function writeDirect(action,method,payload){
    if(opsWriteInFlightV43.has(action)){toast('Transaksi sedang diproses; jangan tekan Simpan dua kali.','warning');return null;}
    opsWriteInFlightV43.add(action);const idem=idemKey(action);beginBusy('Menyimpan…');try{const r=await bridge.call(method,state.token,payload||{},idem);if(r&&r.ok===false)throw new Error(r.message||'Transaksi gagal');localStorage.removeItem('ww_gh_idem_'+action);toast('Berhasil disimpan'+(r&&r.txnId?' · '+r.txnId:''));closeSheet();invalidateDataModules();refreshBootstrapLight().catch(err=>console.warn('[Wills Warehouse] refresh ringan:',err.message));return r}catch(e){toast(e.message);throw e}finally{opsWriteInFlightV43.delete(action);endBusy()}}
  async function reloadDeliveryModule(){const m=await bridge.call('getAppModule',state.token,'delivery');Object.assign(state.data,m||{});state.moduleReady.delivery=true;return m;}
  function upsertFreshDeliveryV1354(d){
    if(!d||!d.sjId)return;
    state.data=state.data||{};
    const list=Array.isArray(state.data.deliveries)?state.data.deliveries:[],
      i=list.findIndex(x=>String(x.sjId)===String(d.sjId));
    // A short status acknowledgement must not erase saved SJ lines needed for thermal print.
    if(i>=0){
      const previous=list[i];
      if(String(previous.status||'').toUpperCase()!=='DRAFT'&&
         String(d.status||'').toUpperCase()==='DRAFT'){
        // Late stale reads must never downgrade an acknowledged shipped SJ.
        return;
      }
      if((!Array.isArray(d.lines)||!d.lines.length)&&Array.isArray(previous.lines)&&previous.lines.length)
        d={...previous,...d,lines:previous.lines};
      list[i]=d;
    }else list.unshift(d);
    state.data.deliveries=list;
  }
  // v4.4: persistent uncertainty guard: a slow Bridge response is never permission to dispatch again.
  const WW_DISPATCH_PENDING_PREFIX_V44='ww_dispatch_pending_v44_';
  function dispatchPendingKeyV44(id){return WW_DISPATCH_PENDING_PREFIX_V44+String(id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);}
  function dispatchPendingV44(id){try{return JSON.parse(localStorage.getItem(dispatchPendingKeyV44(id))||'null')}catch(_){return null}}
  function dispatchStorePendingV44(id,idem){
    const key=dispatchPendingKeyV44(id);
    const encoded=JSON.stringify({sjId:String(id),idem:String(idem),startedAt:Date.now()});
    try{
      localStorage.setItem(key,encoded);
      return localStorage.getItem(key)===encoded;
    }catch(_){return false;}
  }
  function dispatchClearPendingV44(id){try{localStorage.removeItem(dispatchPendingKeyV44(id));localStorage.removeItem('ww_gh_idem_dispatch_'+id)}catch(_){}}
  // v1.5.2.13: update the active SJ in place. Never rebuild sheetHtml
  // or replace the staff's current screen just because a status changed.
  // A consistent processing notice remains visible while the canonical stock
  // transaction is still being acknowledged. The elapsed timer is UI-only.
  function wwSjDispatchNoteV15213(id,d){
    const status=String(d.status||'').toUpperCase(),
      pending=!!dispatchPendingV44(id),working=
        opsWriteInFlightV43.has('dispatch_'+id)||wwDispatchWatchersV15214.has(String(id));
    if(pending&&status==='DRAFT'&&working)
      return '<div class="ww-sj-progress-v15215" data-ww-sj-stage-v15215="working" data-ww-sj-progress-v15215>'+
        '<span class="ww-spin-v1526" aria-hidden="true"></span>'+
        '<div class="ww-sj-progress-copy"><strong>Sedang memproses pengiriman…</strong>'+
        '<small data-ww-sj-progress-guidance>Permintaan sudah dikirim. Mohon tunggu; jangan tekan tombol Kirim lagi.</small>'+
        '<small class="ww-sj-progress-time" data-ww-sj-progress-time>Waktu proses: 00:00</small></div></div>';
    if(pending&&status==='DRAFT')
      return '<div class="ww-sj-progress-v15215 ww-sj-progress--uncertain" data-ww-sj-stage-v15215="uncertain"><div class="ww-sj-progress-copy">'+
        '<strong>Status Kirim belum dapat dipastikan</strong>'+
        '<small>Jangan Kirim ulang. Pilih Cek Status Kirim untuk membaca transaksi tanpa memotong stok lagi.</small>'+
        '</div></div>';
    if(['DIKIRIM','DITERIMA','DITERIMA_SEBAGIAN','SELISIH','SELESAI'].includes(status)&&
       String(d.dispatchTxnId||'').trim())
      return '<div class="ww-sj-progress-v15215 ww-sj-progress--done" data-ww-sj-stage-v15215="done"><div class="ww-sj-progress-copy">'+
        '<strong>Berhasil dikirim — silakan Cetak SJ</strong>'+
        '<small>Transaksi sudah dikonfirmasi Warehouse. Jangan tekan Kirim lagi.</small>'+
        '</div></div>';
    return '';
  }
  const wwSjProgressTimersV15215=new Map();
  function wwSjProgressStopV15215(id){
    const key=String(id),timer=wwSjProgressTimersV15215.get(key);
    if(timer!=null)clearInterval(timer);
    wwSjProgressTimersV15215.delete(key);
  }
  function wwSjProgressTickV15215(id){
    const key=String(id),root=$('#sheetRoot'),sheet=root&&root.firstElementChild,
      progress=sheet&&String(sheet.dataset.sheetKey)==='delivery-detail:'+key?
        sheet.querySelector('[data-ww-sj-progress-v15215]'):null;
    if(!progress){wwSjProgressStopV15215(key);return false;}
    const pending=dispatchPendingV44(key),working=
      opsWriteInFlightV43.has('dispatch_'+key)||wwDispatchWatchersV15214.has(key);
    if(!pending||!working){wwSjProgressStopV15215(key);return false;}
    const start=Number(pending.startedAt);
    const seconds=Number.isFinite(start)&&start>0?
      Math.max(0,Math.floor((Date.now()-start)/1000)):0;
    const clock=progress.querySelector('[data-ww-sj-progress-time]');
    if(clock){
      const mm=String(Math.floor(seconds/60)).padStart(2,'0'),
        ss=String(seconds%60).padStart(2,'0');
      clock.textContent='Waktu proses: '+mm+':'+ss;
    }
    const guide=progress.querySelector('[data-ww-sj-progress-guidance]');
    if(guide)guide.textContent=seconds>=35?
      'Masih memeriksa status di Warehouse. Transaksi mungkin sudah tercatat; jangan Kirim ulang.':
      seconds>=15?
      'Proses lebih lama dari biasanya. Sistem tetap memeriksa status otomatis; jangan klik berulang.':
      'Permintaan sudah dikirim. Mohon tunggu; jangan tekan tombol Kirim lagi.';
    return true;
  }
  function wwSjProgressEnsureV15215(id){
    const key=String(id);
    if(!wwSjProgressTickV15215(key))return;
    if(!wwSjProgressTimersV15215.has(key)){
      wwSjProgressTimersV15215.set(key,setInterval(()=>wwSjProgressTickV15215(key),1000));
    }
  }
  function wwSjRenderLinesV15213(d){
    return (d.lines||[]).map(l=>{
      const requested=Number(l.requestedQtyUnit!=null?l.requestedQtyUnit:(l.qtyUnit||0)),
        approved=Number(l.qtyUnit||0),received=Number(l.receivedBase||0)/Number(l.factor||1),
        fulfillment=l.fulfillmentStatus||'DIPENUHI',
        fc=fulfillment==='DIPENUHI'?'ok':fulfillment==='TIDAK TERSEDIA'?'bad':'warn';
      return '<div class="direct-card"><b>'+esc(l.name)+'</b>'+
        '<small>Diminta '+num(requested)+' · disiapkan '+num(approved)+' '+esc(l.sendUnit)+
        (d.status!=='DRAFT'?' · diterima '+num(received):'')+'</small>'+
        (l.fulfillmentReason?'<small>Alasan: '+esc(l.fulfillmentReason)+'</small>':'')+
        '<span class="badge '+fc+'">'+esc(fulfillment)+'</span></div>';
    }).join('');
  }
  function wwSjUpdateDetailV15213(id){
    const root=$('#sheetRoot'),sheet=root&&root.firstElementChild;
    if(!sheet||String(sheet.dataset.sheetKey)!=='delivery-detail:'+id)return false;
    const d=((state.data||{}).deliveries||[]).find(x=>String(x.sjId)===String(id));
    if(!d)return false;
    const status=sheet.querySelector('[data-ww-sj-live-status]'),
      actions=sheet.querySelector('[data-ww-sj-live-actions]'),
      note=sheet.querySelector('[data-ww-sj-live-note]'),
      items=sheet.querySelector('[data-ww-sj-live-lines]');
    if(!status||!actions||!note||!items)return false;
    status.innerHTML=deliveryStatusBadge(d.status);
    const pending=dispatchPendingV44(id),active=opsWriteInFlightV43.has('dispatch_'+id),
      autoChecking=wwDispatchWatchersV15214.has(String(id));
    const noteHtml=wwSjDispatchNoteV15213(id,d),
      nextStage=noteHtml.includes('data-ww-sj-stage-v15215="working"')?'working':
        noteHtml.includes('data-ww-sj-stage-v15215="uncertain"')?'uncertain':
        noteHtml.includes('data-ww-sj-stage-v15215="done"')?'done':'',
      currentStage=note.querySelector('[data-ww-sj-stage-v15215]')?.getAttribute('data-ww-sj-stage-v15215')||'';
    // Preserve the existing spinner/counter nodes between backend polls.
    if(currentStage!==nextStage)note.innerHTML=noteHtml;
    wwSjProgressEnsureV15215(id);
    // Preserve the clicked button and its spinner while dispatch is pending.
    if(!(active&&String(d.status||'').toUpperCase()==='DRAFT')){
      const req=findRequestForDelivery(d),html=wwSjActionMarkupV15211(d,req,{
        canPrint:actionAllowed('draftPrint'),canPrepare:roleCan('DELIVERY_PREPARE'),
        canCancel:roleCan('OWNER_ONLY'),canDispatch:roleCan('DELIVERY_DISPATCH')
      },pending,active||autoChecking);
      const key=String(d.status||'')+'|'+!!pending+'|'+!!(req&&req.requestId)+
        '|'+!!(active||autoChecking);
      if(actions.dataset.wwSjKey!==key){
        actions.innerHTML=html;actions.dataset.wwSjKey=key;
        wwSjBindActionsV15213(id,d,req);
      }
    }
    // A fresh delivery read may include updated approved quantities.
    // Do not erase existing visible rows if the short response omits lines.
    if(Array.isArray(d.lines)&&d.lines.length){
      const next=wwSjRenderLinesV15213(d);
      if(items.innerHTML!==next)items.innerHTML=next;
    }
    return true;
  }
  function wwSjUpdateListV15213(id){
    const root=$('#sheetRoot'),sheet=root&&root.firstElementChild;
    if(!sheet||String(sheet.dataset.sheetKey)!=='delivery-list')return false;
    const d=((state.data||{}).deliveries||[]).find(x=>String(x.sjId)===String(id));
    if(!d)return false;
    const card=Array.from(sheet.querySelectorAll('[data-sjid]')).find(
      x=>String(x.dataset.sjid)===String(id));
    if(card){
      const badge=card.querySelector('.badge');
      if(badge)badge.outerHTML=deliveryStatusBadge(d.status);
      const label=card.querySelector('.ww-request-item-link');
      if(label)label.textContent=String(d.status||'').toUpperCase()==='DRAFT'?
        'Periksa Bahan · Konfirmasi Kirim ›':'Lihat Detail SJ ›';
    }
    const data=(state.data||{}).deliveries||[];
    sheet.querySelectorAll('[data-ww-request-outlet]').forEach(tab=>{
      const count=tab.querySelector('b');
      if(count)count.textContent=num(wwDraftSjCountV15211(data,tab.dataset.wwRequestOutlet),0);
    });
    const top=sheet.querySelector('.ww-request-top span'),
      section=sheet.querySelector('.ww-request-section-head span');
    const count=num(wwDraftSjCountV15211(data,wwSelectedOutletV1522),0)+' DRAFT';
    if(top)top.textContent=count;
    if(section)section.textContent=count;
    return true;
  }
  // v1.5.2.14: canonical read-only verifier. Backend may be posting stock
  // while independently pushing an outlet feed; never dispatch a second time.
  // This watcher can only read getDeliveryDetailFreshV1354 and update the UI.
  const wwDispatchWatchersV15214=new Map(),wwDispatchWatchConfirmedV15214=new Set();
  const WW_DISPATCH_POLL_DELAYS_V15214=[3500,6500,10000,14000,20000,25000];
  function wwDispatchConfirmedV15214(id,fresh){
    return !!fresh&&String(fresh.sjId||'')===String(id)&&
      ['DIKIRIM','DITERIMA','DITERIMA_SEBAGIAN','SELISIH','SELESAI'].includes(
        String(fresh.status||'').toUpperCase())&&
      !!String(fresh.dispatchTxnId||'').trim();
  }
  function wwDispatchStopWatchV15214(id){
    const key=String(id),item=wwDispatchWatchersV15214.get(key);
    if(!item)return;
    item.stopped=true;
    if(item.timer!=null)clearTimeout(item.timer);
    wwDispatchWatchersV15214.delete(key);
  }
  function wwDispatchStartWatchV15214(id){
    const key=String(id);
    if(wwDispatchWatchersV15214.has(key))return;
    if(!dispatchPendingV44(key))return;
    const item={stopped:false,timer:null,attempt:0},attempts=WW_DISPATCH_POLL_DELAYS_V15214.length;
    wwDispatchWatchersV15214.set(key,item);
    const schedule=()=>{
      if(item.stopped||!dispatchPendingV44(key)){
        wwDispatchStopWatchV15214(key);return;
      }
      if(item.attempt>=attempts){
        wwDispatchStopWatchV15214(key);
        dispatchUpdateIfVisibleV44(key);return;
      }
      item.timer=setTimeout(async()=>{
        item.timer=null;
        if(item.stopped)return;
        try{
          const fresh=await bridge.call('getDeliveryDetailFreshV1354',state.token,key);
          if(item.stopped)return;
          if(wwDispatchConfirmedV15214(key,fresh)){
            wwDispatchWatchConfirmedV15214.add(key);
            dispatchApplyStatusV44(key,fresh);
            wwDispatchStopWatchV15214(key);
            toast((fresh.noSj||'Surat Jalan')+' · DIKIRIM sudah terkonfirmasi. Cetak Thermal siap.','success');
            return;
          }
          // An older DRAFT snapshot cannot release a pending dispatch guard.
        }catch(error){
          console.warn('[Warehouse] Status SJ belum tersedia (read-only):',
            String(error&&error.message||error));
        }
        if(!item.stopped){
          item.attempt+=1;
          schedule();
        }
      },WW_DISPATCH_POLL_DELAYS_V15214[item.attempt]);
    };
    dispatchUpdateIfVisibleV44(key);
    schedule();
  }
  function dispatchUpdateIfVisibleV44(id){
    const key=currentSheetKey();
    if(key==='delivery-detail:'+id)wwSjUpdateDetailV15213(id);
    else if(key==='delivery-list')wwSjUpdateListV15213(id);
  }
  function dispatchApplyStatusV44(id,fresh){
    if(!fresh||String(fresh.sjId||'')!==String(id))return false;
    upsertFreshDeliveryV1354(fresh);
    if(String(fresh.status||'').toUpperCase()==='DRAFT')return false;
    dispatchClearPendingV44(id);
    wwDispatchStopWatchV15214(id);
    dispatchUpdateIfVisibleV44(id);
    return true;
  }

  // V1.5.2.7: Recovery pengunci HP, hanya dua SJ yang telah diaudit dari ledger canonical.
  // Read-only backend check. NO dispatch, NO ledger posting, NO status mutation.
  const WW_RECOVERY_SJ_V1527=Object.freeze({
    'SJID-20261029-234354-7996FA2573':'SJ-20261029-0003',
    'SJID-20261031-061351-DB8DACB09F':'SJ-20261031-0002'
  });
  const wwRecoveryBusyV1527=new Set();
  function sjRecoveryEligibleV1527(id,d){
    return currentRole()==='OWNER' && !!dispatchPendingV44(id) &&
      String((d||{}).noSj||'')===String(WW_RECOVERY_SJ_V1527[id]||'') &&
      !!WW_RECOVERY_SJ_V1527[id];
  }
  async function recoverSjLocalV1527(id){
    const current=((state.data||{}).deliveries||[]).find(x=>String(x.sjId)===String(id));
    if(!sjRecoveryEligibleV1527(id,current)||wwRecoveryBusyV1527.has(id))return;
    const pending=dispatchPendingV44(id);
    if(!pending || String(pending.sjId)!==String(id) ||
      !Number.isFinite(Number(pending.startedAt)) ||
      Date.now()-Number(pending.startedAt)<300000){
      toast('Percobaan Kirim belum cukup lama / tidak valid. Pengunci tetap aktif.','warning');return;
    }
    wwRecoveryBusyV1527.add(id);beginBusy('Mengecek bukti SJ (read-only)…');
    try{
      const expected=WW_RECOVERY_SJ_V1527[id];
      const valid=x=>x&&String(x.sjId||'')===String(id)&&
        String(x.noSj||'')===expected&&String(x.status||'').toUpperCase()==='DRAFT'&&
        !String(x.dispatchTxnId||'').trim();
      const first=await bridge.call('getDeliveryDetailFreshV1354',state.token,id);
      if(!valid(first))throw new Error('SJ bukan DRAFT bersih; jangan buka pengunci.');
      const second=await bridge.call('getDeliveryDetailFreshV1354',state.token,id);
      if(!valid(second)||String(first.updatedAt||'')!==String(second.updatedAt||''))
        throw new Error('Pembacaan backend berubah/tidak konsisten.');
      const typed=window.prompt('Audit ledger Warehouse sebelumnya tidak menemukan dispatch POSTED untuk '+expected+'. '+
        'Status backend masih DRAFT. Membuka pengunci LOKAL saja, tanpa mengirim/stok. '+
        'Pastikan tidak ada proses Kirim dari HP lain. Ketik nomor SJ untuk melanjutkan:','');
      if(String(typed||'').trim()!==expected){toast('Nomor SJ tidak sesuai.','warning');return;}
      if(!window.confirm('Lepas pengunci lokal '+expected+'? Tidak akan menekan Kirim atau mengubah ledger.'))return;
      const third=await bridge.call('getDeliveryDetailFreshV1354',state.token,id);
      if(!valid(third)||String(third.updatedAt||'')!==String(second.updatedAt||''))
        throw new Error('Status SJ berubah saat konfirmasi.');
      const latest=dispatchPendingV44(id);
      if(!latest||String(latest.idem)!==String(pending.idem))
        throw new Error('Identitas percobaan Kirim berubah.');
      dispatchClearPendingV44(id);upsertFreshDeliveryV1354(third);
      toast('Pengunci '+expected+' dilepas. Tidak ada pengiriman baru.','success',12000);
      dispatchUpdateIfVisibleV44(id);
    }catch(e){
      toast('Recovery tertahan: '+String(e&&e.message||e)+'. Tidak ada data gudang yang diubah.','warning',12000);
    }finally{wwRecoveryBusyV1527.delete(id);endBusy();}
  }
  // v4.5: canonical read-only status refresh for stale drafts and pending dispatch.
  const wwFreshChecksV45=new Map();
  function dispatchMaybeRefreshFreshV45(id){
    const key=String(id),now=Date.now(),prev=wwFreshChecksV45.get(key);
    if(prev&&(prev.running||now-prev.at<15000))return;
    wwFreshChecksV45.set(key,{running:true,at:now});
    bridge.call('getDeliveryDetailFreshV1354',state.token,id).then(fresh=>{
      if(!fresh||String(fresh.sjId||'')!==key)return;
      const old=((state.data||{}).deliveries||[]).find(x=>String(x.sjId)===key);
      const fields=['status','dispatchTxnId','updatedAt','lastSync'];
      const changed=!old||fields.some(k=>String(old[k]||'')!==String(fresh[k]||''));
      if(!changed&&!dispatchPendingV44(id))return;
      if(!dispatchApplyStatusV44(id,fresh)){
        // DRAFT cannot prove no dispatch; do not clear a pending guard.
        upsertFreshDeliveryV1354(fresh);
        dispatchUpdateIfVisibleV44(id);
      }
    }).catch(e=>console.warn('[Warehouse v4.5] Fresh SJ read failed:',e&&e.message||e))
      .finally(()=>wwFreshChecksV45.set(key,{running:false,at:Date.now()}));
  }
  async function dispatchCheckStatusV44(id){
    if(opsWriteInFlightV43.has('status_'+id))return;
    opsWriteInFlightV43.add('status_'+id);
    beginBusy('Memeriksa status '+id+'…');
    try{
      const fresh=await bridge.call('getDeliveryDetailFreshV1354',state.token,id);
      if(!fresh||String(fresh.sjId||'')!==String(id))throw new Error('Status belum tersedia.');
      const final=dispatchApplyStatusV44(id,fresh);
      if(final){
        toast((fresh.noSj||'Surat Jalan')+' berstatus '+fresh.status+'. Tidak ada pengiriman ulang.','success');
        // A confirmed fresh SJ is already upserted; no full-module reload or modal repaint.
      }else{
        toast('SJ masih DRAFT di snapshot. Ada percobaan kirim yang belum terverifikasi. Jangan klik Kirim lagi; cek Riwayat/Audit Recovery.','warning',12000);
        dispatchUpdateIfVisibleV44(id);
      }
    }catch(err){toast('Status belum berhasil dibaca. Jangan kirim ulang: '+String(err&&err.message||err),'warning',12000);}
    finally{opsWriteInFlightV43.delete('status_'+id);endBusy();}
  }
  function dispatchAcceptResponseV44(id,response){
    if(!response||response.ok===false){
      if(wwDispatchWatchConfirmedV15214.has(String(id)))return;
      toast('Hasil Kirim belum berhasil dikonfirmasi. Jangan kirim ulang; gunakan Cek Status.','warning',12000);
      dispatchUpdateIfVisibleV44(id);return;
    }
    const fresh=response.deliveryV1354||null;
    if(wwDispatchWatchConfirmedV15214.has(String(id))){
      // Canonical commit was already read while the backend pushed the outlet feed.
      wwDispatchStopWatchV15214(id);
      return;
    }
    if(!dispatchApplyStatusV44(id,fresh)){
      toast('Backend merespons, tetapi status SJ belum terverifikasi. Gunakan Cek Status; jangan kirim ulang.','warning',12000);
      dispatchUpdateIfVisibleV44(id);
      return;
    }
    const feed=response.feedSyncV1354||response.feedSyncV1353||null;
    if(feed&&feed.ok)toast((fresh.noSj||'SJ')+' · '+fresh.status+' · Feed outlet berhasil.','success');
    else if(feed&&['QUEUED','PENDING_WORKER','SCHEDULED'].includes(String(feed.status||'').toUpperCase()))toast((fresh.noSj||'SJ')+' · '+fresh.status+' tercatat. Feed outlet menunggu worker; JANGAN Kirim ulang.','warning',12000);
    else toast((fresh.noSj||'SJ')+' · '+fresh.status+' tercatat. Feed outlet belum terkonfirmasi; periksa status sinkronisasi.','warning',12000);
    // The module refresh must never block the dispatch confirmation UI.
    // The fresh canonical delivery is already in state; avoid a duplicate reload and repaint.
  }
  async function writeDeliveryDirect(action,method,payload,sjId){
    if(opsWriteInFlightV43.has(action)){toast('SJ sedang diproses; jangan tekan ulang.','warning');return null;}
    const dispatch=method==='dispatchDelivery';
    if(dispatch&&dispatchPendingV44(sjId)){
      toast('Percobaan kirim sebelumnya belum terverifikasi. Gunakan Cek Status Kirim, jangan kirim ulang.','warning',12000);
      dispatchUpdateIfVisibleV44(sjId);return {ok:false,pending:true};
    }
    opsWriteInFlightV43.add(action);
    const idem=idemKey(action),fromKey=currentSheetKey();
    if(dispatch&&!dispatchStorePendingV44(sjId,idem)){
      opsWriteInFlightV43.delete(action);
      toast('Penyimpanan pengunci Kirim gagal. Tidak ada permintaan pengiriman dikirim ke backend. Periksa penyimpanan browser.','error',12000);
      return {ok:false,blocked:true};
    }
    beginBusy(dispatch?'Konfirmasi Kirim SJ…':'Memproses Surat Jalan…');
    try{
      if(dispatch){
        const remote=bridge.call(method,state.token,payload||{},idem);
        wwDispatchStartWatchV15214(sjId);
        const guarded=remote.then(value=>({type:'value',value}),error=>({type:'error',error}));
        let timer;
        const result=await Promise.race([
          guarded,
          new Promise(resolve=>{timer=setTimeout(()=>resolve({type:'slow'}),25000);})
        ]);
        clearTimeout(timer);
        if(result.type==='slow'){
          if(!wwDispatchWatchConfirmedV15214.has(String(sjId)))
            toast('Pengiriman masih diproses di Warehouse. Lihat spinner dan waktu tunggu di SJ; jangan tekan Kirim lagi.','info',10000);
          dispatchUpdateIfVisibleV44(sjId);
          guarded.then(out=>{
            if(out.type==='value')dispatchAcceptResponseV44(sjId,out.value);
            else if(!wwDispatchWatchConfirmedV15214.has(String(sjId))){
              toast('Respons Kirim terlambat/gagal. Sistem terus cek status; jangan Kirim ulang.','warning',12000);
              dispatchUpdateIfVisibleV44(sjId);
            }
          });
          return {ok:false,pending:true};
        }
        if(result.type==='error')throw result.error;
        dispatchAcceptResponseV44(sjId,result.value);
        return result.value;
      }
      const result=await bridge.call(method,state.token,payload||{},idem);
      if(result&&result.ok===false)throw new Error(result.message||'Proses SJ gagal.');
      localStorage.removeItem('ww_gh_idem_'+action);
      toast('Berhasil disimpan'+(result&&result.txnId?' · '+result.txnId:''),'success');
      // Keep the original follow-up navigation, but refresh outside this spinner.
      reloadDeliveryModule().then(()=>{if(fromKey==='delivery-fulfillment:'+sjId&&sheetHistoryDepth>1){pendingAfterSheetBack=()=>directDeliveryDetail(sjId);closeSheet();}else dispatchUpdateIfVisibleV44(sjId);}).catch(e=>toast('SJ tersimpan, refresh status belum selesai: '+e.message,'warning'));
      return result;
    }catch(err){
      if(dispatch){
        if(wwDispatchWatchConfirmedV15214.has(String(sjId)))
          return {ok:true,verified:true,source:'CANONICAL_READ_ONLY'};
        toast('Konfirmasi Kirim belum pasti: '+String(err&&err.message||err)+'. Jangan kirim ulang sebelum Cek Status.','warning',12000);
        dispatchUpdateIfVisibleV44(sjId);
        return {ok:false,pending:true};
      }
      toast(String(err&&err.message||err),'error');throw err;
    }finally{
      opsWriteInFlightV43.delete(action);endBusy();
      if(dispatch)dispatchUpdateIfVisibleV44(sjId);
    }
  }
  async function callDirect(method,...args){return bridge.call(method,state.token,...args)}
  const matByCode=()=>Object.fromEntries(((state.data||{}).materials||[]).map(m=>[m.code,m]));
  const matOpts=(purch=false)=>((state.data||{}).materials||[]).filter(m=>m.active==='YA'&&(!purch||m.purchasable!==false)).map(m=>`<option value="${esc(m.code)}">${esc(m.name)} · ${esc(m.receiveUnit||'')}</option>`).join('');
  function openDirectSheet(action){
    if(inventoryOnlyV1520()&&moneyActionsV1520.includes(action))return toast('Keuangan di luar Warehouse. Pembayaran dilakukan offline.','warning');
    if(action==='purchase')return directPurchase(); if(action==='packing')return directPacking(); if(action==='delivery')return directDelivery(); if(action==='draftPrint')return directDraftPrintList();
    if(action==='outletPayment')return directOutletPayment(); if(action==='expense')return directExpense(); if(action==='supplierPayment')return directSupplierPayment();
    if(action==='adjustment')return directAdjustment(); if(action==='packingWage')return directPackingWage(); if(action==='centralPrice')return directCentralPrice();if(action==='internalPrice')return directInternalPrice();
    if(action==='users')return directUsers(); if(action==='audit')return directAudit(); if(action==='recovery')return directRecovery();
    if(action==='offlineSjValue')return directOfflineSjValuesV1520();
    if(action==='financeActual')return directFinanceActualV1300(); if(action==='stockReport')return directStockReportV1300(); if(action==='dispatchRecap')return directDispatchRecapV1320();
    if(action==='materials')return directMaterials(); if(action==='hppCorrection')return directHistoricalHppCorrection();
    toast('Modul belum tersedia.');
  }
  async function directOfflineSjValuesV1520(){
    if(!inventoryOnlyV1520())return toast('Laporan offline hanya tersedia dalam mode Inventory Only.','warning');
    sheetHtml('Nilai Bahan Outlet · Offline','<div class="role-guide">Memuat nilai dari snapshot Surat Jalan…</div>');
    try{
      const data=await callDirect('getWarehouseOfflineSjValuesV1520',50);
      if(!data||!data.ok)throw new Error('Data nilai bahan belum tersedia.');
      const groups=(data.outlets||[]).map(x=>'<div class="list-card"><div class="list-main"><b>'+esc(x.outletName||x.outletCode)+'</b><small>'+num(x.sjCount,0)+' SJ dalam laporan</small></div><div class="list-side"><strong>'+rp(x.receivedValue)+'</strong><small>Nilai diterima</small></div></div>').join('');
      const details=(data.rows||[]).map(x=>'<div class="list-card"><div class="list-main"><b>'+esc(x.noSj)+'</b><small>'+esc(x.outletName)+' · '+esc(x.status)+'</small></div><div class="list-side"><strong>'+rp(x.sentValue)+'</strong><small>Terima '+rp(x.receivedValue)+'</small></div></div>').join('');
      const html='<div class="role-guide"><b>Nilai barang, bukan catatan pelunasan</b><span>Harga internal mengikuti snapshot pada SJ. Pembayaran supplier dan outlet berlangsung offline, sehingga status sudah/belum dibayar tidak dinilai di sini. Menampilkan maksimal 50 SJ terkirim terakhir.</span></div><h4>Ringkasan per outlet</h4><div class="direct-list">'+(groups||'<div class="empty">Belum ada SJ.</div>')+'</div><h4>Rincian Surat Jalan</h4><div class="direct-list">'+(details||'<div class="empty">Belum ada SJ.</div>')+'</div><div class="actions"><button class="btn btn-line" id="ghCancel" type="button">Tutup</button></div>';
      sheetHtml('Nilai Bahan Outlet · Offline',html);
      const cancel=$('#ghCancel');if(cancel)cancel.onclick=closeSheet;
    }catch(e){sheetHtml('Nilai Bahan Outlet · Offline','<div class="role-guide"><b>Gagal membaca nilai bahan.</b><span>'+esc(e&&e.message||e)+'</span></div><div class="actions"><button class="btn btn-line" id="ghCancel" type="button">Tutup</button></div>');const cancel=$('#ghCancel');if(cancel)cancel.onclick=closeSheet;}
  }
  function directPurchase(){
    const d=state.data||{},sups=d.suppliers||[],offline=inventoryOnlyV1520();
    sheetHtml('Belanja Bahan',`<div class="role-guide"><b>Guard Harga & Satuan Aktif</b><span>Satuan pembelian mengikuti nota dan profil Master Bahan. Contoh Creamer: 1 karton = 24 box × 500 gr (Rp780.000/karton = Rp32.500/box). UHT: 1 karton = 12 pcs. Jangan masukkan harga karton sebagai harga box.</span><span>Sistem akan memperingatkan jika harga/HPP melonjak tidak wajar sebelum transaksi diposting.</span></div><form id="ghPurchase"><label class="field"><span>Supplier</span><select name="supplierId"><option value="">Supplier sekali pakai</option>${sups.filter(x=>x.active==='YA').map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label class="field"><span>Nama supplier sekali pakai</span><input name="supplierName"></label>${offline?'<div class="role-guide"><b>Inventory Only · Pembayaran offline</b><p>Barang masuk meskipun saldo Kas/Bank Rp0. Harga nota tetap tersimpan untuk HPP. Warehouse tidak mencatat pembayaran atau membuat utang.</p></div>':`<div class="form-2"><label class="field"><span>Pembayaran</span><select name="paymentStatus"><option>LUNAS</option><option>TEMPO</option></select></label><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label></div>`}<div class="form-2"><label class="field"><span>Status nota</span><select name="notaStatus"><option>ADA NOTA</option><option>TANPA NOTA</option><option>NOTA MENYUSUL</option></select></label><label class="field"><span>No Nota</span><input name="invoiceNo"></label></div>${offline?'':`<label class="field"><span>Jatuh tempo (Tempo)</span><input name="dueDate" type="date"></label>`}<label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div id="ghPurchaseLines"></div><button class="btn btn-soft" type="button" id="ghAddPurchase">+ Tambah item</button><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary" type="submit">Review & Posting Belanja</button></div></form>`);
    const box=$('#ghPurchaseLines'),mats=((state.data||{}).materials||[]);
    const unitsFor=m=>Array.isArray(m&&m.purchaseUnits)&&m.purchaseUnits.length?m.purchaseUnits:[{unit:m&&m.receiveUnit||'',multiplier:1,label:m&&m.receiveUnit||''}];
    const add=()=>{
      const el=document.createElement('div');el.className='purchase-line-card';
      el.innerHTML=`<div class="purchase-line-head"><b>Item Belanja</b><button class="line-remove" type="button" aria-label="Hapus item">×</button></div><label class="field purchase-material"><span>Bahan</span><select class="code" required><option value="">Pilih bahan</option>${matOpts(true)}</select></label><div class="purchase-grid"><label class="field"><span>Satuan Beli</span><select class="purchase-unit" required><option value="">Satuan</option></select></label><label class="field"><span>Qty</span><input class="qty" type="number" min="0.000001" step="0.000001" inputmode="decimal" placeholder="0" required></label><label class="field purchase-price-field"><span>Harga / Satuan Beli</span><input class="price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0" required></label></div><div class="purchase-hint" aria-live="polite"></div>`;
      const code=el.querySelector('.code'),unit=el.querySelector('.purchase-unit'),price=el.querySelector('.price'),hint=el.querySelector('.purchase-hint');
      const refresh=()=>{const m=mats.find(z=>z.code===code.value);if(!m){unit.innerHTML='<option value="">Satuan</option>';hint.textContent='';price.value='';return;}const profiles=unitsFor(m);unit.innerHTML=profiles.map(x=>`<option value="${esc(x.unit)}" data-mul="${Number(x.multiplier||1)}">${esc(x.label||x.unit)}${Number(x.multiplier||1)>1?' · '+Number(x.multiplier)+' '+esc(m.receiveUnit):''}</option>`).join('');const applyPrice=()=>{const opt=unit.options[unit.selectedIndex],mul=Number(opt&&opt.dataset.mul||1),base=Number(m.lastPurchasePrice||m.defaultPurchasePrice||0);if(base>0)price.value=String(Math.round(base*mul*100)/100);const src=String(m.lastPurchasePriceSource||'');let refLabel=base>0?`Referensi aman ${rp(base)}/${m.receiveUnit}`:'';if(src.startsWith('REINTERPRETED_'))refLabel+=` · transaksi lama ${rp(m.lastPurchasePriceRaw||0)}/${m.receiveUnit} ditahan & dibaca ulang sesuai kemasan`;else if(m.lastPurchasePriceRejected)refLabel+=` · harga transaksi lama ${rp(m.lastPurchasePriceRaw||0)}/${m.receiveUnit} ditahan karena tidak wajar`;hint.innerHTML=`<b>Canonical:</b> 1 ${esc(unit.value)} = ${num(mul*Number(m.factor||1))} ${esc(m.baseUnit)}${refLabel?' · '+esc(refLabel):''}`;};unit.onchange=applyPrice;applyPrice();};
      code.onchange=refresh;el.querySelector('.line-remove').onclick=()=>el.remove();box.appendChild(el);
    };
    add();$('#ghAddPurchase').onclick=add;$('#ghCancel').onclick=closeSheet;
    $('#ghPurchase').onsubmit=async e=>{
      e.preventDefault();
      const form=e.target, button=e.submitter||form.querySelector('button[type="submit"]');
      if(form.dataset.wwOpsSubmitting==='1')return;
      form.dataset.wwOpsSubmitting='1';if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
      try{
        const fd=new FormData(form),supplierId=fd.get('supplierId');
        const items=[...box.querySelectorAll('.purchase-line-card')].map(x=>({
          code:x.querySelector('.code').value,
          purchaseUnit:x.querySelector('.purchase-unit').value,
          qtyUnit:x.querySelector('.qty').value,
          priceUnit:x.querySelector('.price').value
        }));
        if(!items.length)throw new Error('Minimal satu bahan harus dicatat.');
        if(items.some(x=>!x.code||!x.purchaseUnit||!(Number(x.qtyUnit)>0)||!(Number(x.priceUnit)>0)))throw new Error('Lengkapi bahan, satuan, qty dan harga satuan yang valid.');
        if(new Set(items.map(x=>x.code)).size!==items.length)throw new Error('Bahan yang sama tidak boleh dicatat dua kali. Gabungkan jumlahnya dalam satu baris.');
        if(!supplierId&&!String(fd.get('supplierName')||'').trim())throw new Error('Pilih supplier atau isi nama supplier sekali pakai.');
        const payment=offline?'OFFLINE':String(fd.get('paymentStatus')||'').toUpperCase();
        if(payment==='TEMPO'&&!fd.get('dueDate'))throw new Error('Pembelian TEMPO perlu tanggal jatuh tempo.');
        if(String(fd.get('notaStatus')||'')!=='ADA NOTA'&&!String(fd.get('note')||'').trim())throw new Error('Pembelian tanpa nota/nota menyusul wajib ada alasan di Catatan.');
        let guard;
        await withBusy('Memeriksa satuan dan HPP sebelum posting…',async()=>{
          guard=await callDirect('previewPurchaseGuard',{items});
        });
        if(!guard)throw new Error('Hasil review belanja tidak diterima. Tidak ada posting.');
        const blocked=Array.isArray(guard.blockingErrors)?guard.blockingErrors:[];
        if(guard.ok===false||blocked.length)throw new Error('BELANJA DIBLOKIR: '+(blocked.join(' | ')||'Periksa kembali harga dan satuan pembelian.'));
        const warnings=Array.isArray(guard.warnings)?guard.warnings:[];
        const total=items.reduce((sum,x)=>sum+Number(x.qtyUnit)*Number(x.priceUnit),0);
        const summary='TOTAL BELANJA '+rp(total)+'\n'+items.length+' bahan · '+(offline?'PEMBAYARAN OFFLINE':payment)+'\n\n';
        if(guard.requiresConfirmation){
          if(!window.confirm('PERINGATAN REVIEW BELANJA\n\n'+summary+'• '+warnings.join('\n• ')+'\n\nPastikan qty, kemasan dan harga pada nota sudah benar. Tetap posting?'))return;
        }else if(!window.confirm('KONFIRMASI BELANJA\n\n'+summary+'Posting satu kali ke gudang sekarang?'))return;
        await writeDirect('purchase','postPurchase',{
          supplier:supplierId?{id:supplierId}:{name:fd.get('supplierName')},
          paymentStatus:payment,paymentSource:offline?'':fd.get('paymentSource'),
          notaStatus:fd.get('notaStatus'),invoiceNo:fd.get('invoiceNo'),
          dueDate:fd.get('dueDate'),note:fd.get('note'),items,
          guardAccepted:!!guard.requiresConfirmation,guardHash:guard.guardHash||''
        });
      }catch(err){
        toast('Belanja belum diposting / perlu dicek: '+String(err&&err.message||err),'warning');
      }finally{
        delete form.dataset.wwOpsSubmitting;
        if(button&&button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}
      }
    };
  }
  function directPacking(){
    const maps=((state.data||{}).mappings||[]).filter(x=>x.kind==='PACKING'&&x.active==='YA'),mats=((state.data||{}).materials||[]),stock=((state.data||{}).stock||[]);
    if(!maps.length)return toast('Mapping Packing belum tersedia.');
    sheetHtml('Batch Packing',`<div class="role-guide"><b>Hasil Aktual & Yield Variance</b><span>Masukkan bahan sumber sesuai unit aslinya, lalu jumlah pack yang benar-benar jadi di lapangan.</span><span>Sistem tetap menjaga nilai bahan dan mencatat selisih teori vs aktual sebagai variance. Hasil aktual tidak dipaksa sama dengan hasil teoritis.</span></div><form id="ghPack"><label class="field"><span>Proses</span><select name="mappingId" id="ghPackMap" required><option value="">Pilih</option>${maps.map(x=>`<option value="${esc(x.id)}">${esc(x.sourceName)} → ${esc(x.outputName)}</option>`).join('')}</select></label><div id="ghPackSource" class="demo-box">Pilih proses packing.</div><div class="form-2"><label class="field"><span id="ghPackInputLabel">Bahan sumber</span><input name="inputQtyReceive" id="ghPackInput" type="text" inputmode="decimal" placeholder="0" required></label><label class="field"><span>Hasil aktual (pcs)</span><input name="outputQtyUnit" id="ghPackActual" type="number" min="1" step="1" required></label><label class="field"><span id="ghPackRemainLabel">Sisa usable</span><input name="remainderQtyBase" id="ghPackRemain" type="text" inputmode="decimal" value="0"></label><label class="field"><span id="ghPackWasteLabel">Waste</span><input name="wasteQtyBase" id="ghPackWaste" type="text" inputmode="decimal" value="0"></label></div><div id="ghPackVariance" class="demo-box">Isi bahan sumber dan hasil aktual.</div><div class="form-2"><label class="field"><span>Packer</span><input name="packer" value="${esc((state.data.user||{}).name||'')}" required></label><label class="field"><span>Upah</span><input name="wageAmount" type="number" min="0" value="0"></label></div><label class="field"><span>Catatan QC</span><textarea name="note" id="ghPackNote" placeholder="Wajib jika variance lebih dari 5 pack"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting Packing</button></div></form>`);
    const form=$('#ghPack'),sel=$('#ghPackMap'),input=$('#ghPackInput'),actual=$('#ghPackActual'),remain=$('#ghPackRemain'),waste=$('#ghPackWaste'),box=$('#ghPackVariance'),srcBox=$('#ghPackSource');
    const parseNonNeg=(v,label)=>{const raw=String(v??'').trim().replace(/\s+/g,'').replace(',','.');if(!/^\d+(?:\.\d+)?$/.test(raw))throw new Error(label+' harus angka valid.');const n=Number(raw);if(!Number.isFinite(n)||n<0)throw new Error(label+' tidak valid.');return n;};
    const current=()=>maps.find(x=>x.id===sel.value)||null;
    const material=code=>mats.find(x=>x.code===code)||null;
    const stockOf=code=>stock.find(x=>x.code===code)||{qty:0,value:0,avgCost:0};
    const calc=()=>{
      const map=current();if(!map){srcBox.textContent='Pilih proses packing.';box.textContent='Isi bahan sumber dan hasil aktual.';return null;}
      const source=material(map.sourceCode),output=material(map.outputCode),st=stockOf(map.sourceCode),factor=Number(source&&source.factor||1),std=Number(map.qtySource||0),sourceUnit=source&&source.receiveUnit||source&&source.baseUnit||'',baseUnit=source&&source.baseUnit||'';
      $('#ghPackInputLabel').textContent=`Bahan sumber (${sourceUnit})`;$('#ghPackRemainLabel').textContent=`Sisa usable (${baseUnit})`;$('#ghPackWasteLabel').textContent=`Waste (${baseUnit})`;
      srcBox.innerHTML=`<b>${esc(map.sourceName)} → ${esc(map.outputName)}</b><br>1 ${esc(sourceUnit)} = ${num(factor)} ${esc(baseUnit)} · standar 1 ${esc(output&&output.receiveUnit||'pcs')} = ${num(std)} ${esc(baseUnit)}<br>Stok sumber tersedia ${num(Number(st.qty||0)/factor)} ${esc(sourceUnit)}.`;
      let q,r,w,a;try{q=parseNonNeg(input.value||'0','Bahan sumber');r=parseNonNeg(remain.value||'0','Sisa');w=parseNonNeg(waste.value||'0','Waste');a=Number(actual.value||0);}catch(e){box.className='demo-box';box.textContent=e.message;return null;}
      const inputBase=q*factor,packedBase=inputBase-r-w;if(inputBase<=0||packedBase<=0||!Number.isInteger(a)||a<=0){box.className='demo-box';box.innerHTML=`Input canonical ${num(inputBase)} ${esc(baseUnit)}. Isi hasil aktual untuk melihat variance.`;return null;}
      const theoretical=packedBase/std,variance=a-theoretical,variancePct=theoretical>0?variance/theoretical*100:0,avg=packedBase/a,yieldBase=a*std-packedBase,fillPct=(avg/std-1)*100,abs=Math.abs(variance),status=abs<=2?'AMAN':abs<=5?'PERHATIKAN':'CEK';
      box.className='notice '+(status==='AMAN'?'ok':status==='PERHATIKAN'?'warn':'bad');
      box.innerHTML=`<b>Teori ${num(theoretical)} pcs → Aktual ${num(a,0)} pcs</b><br>Variance ${(variance>=0?'+':'')+num(variance)} pcs (${(variancePct>=0?'+':'')+num(variancePct)}%) · Status <b>${status}</b><br>Rata-rata aktual ${num(avg)} ${esc(baseUnit)}/pcs vs standar ${num(std)} · standard-equivalent variance ${(yieldBase>=0?'+':'')+num(yieldBase)} ${esc(baseUnit)}.<br><small>Nilai bahan tetap dibagi ke hasil aktual; selisih ini tercatat di Ledger Variance Packing.</small>`;
      return{map,source,output,inputQtyReceive:q,inputQtyBase:inputBase,actual:a,remainder:r,waste:w,theoretical,variance,status};
    };
    [sel,input,actual,remain,waste].forEach(x=>{x.addEventListener('input',calc);x.addEventListener('change',calc)});calc();$('#ghCancel').onclick=closeSheet;
    form.onsubmit=async e=>{e.preventDefault();const c=calc();if(!c)return toast('Lengkapi data packing.');if(c.status==='CEK'&&String($('#ghPackNote').value||'').trim().length<5)return toast('Variance lebih dari 5 pack. Isi Catatan QC.');const fd=new FormData(form);await writeDirect('packing','postPackingBatch',{mappingId:c.map.id,inputQtyReceive:c.inputQtyReceive,inputQtyBase:c.inputQtyBase,outputQtyUnit:c.actual,remainderQtyBase:c.remainder,wasteQtyBase:c.waste,packer:fd.get('packer'),wageAmount:Number(fd.get('wageAmount')||0),note:fd.get('note')});};
  }
  // v4.3 · Permintaan outlet: ringkasan dan cetak tanpa mutasi data.
  function opsRequestV43(requestId) {
    return ((wwQueueV1526&&wwQueueV1526.rows)||[]).find(x=>String(x.requestId)===String(requestId))||
      ((state.data||{}).incomingRequests||[]).find(x=>String(x.requestId||'')===String(requestId||''))||null;
  }
  // V1.5.2.5 — staff verifies actual availability, INCLUDING zero,
  // then saves audited availability to the linked DRAFT SJ before printing.
  const wwPickingReportV1525=new Map(),wwPickingPricesV1526=new Map();
  function wwPickingPriceV1526(requestId,lineNo){
    const p=wwPickingPricesV1526.get(String(requestId));
    return p&&p.lines.find(x=>Number(x.lineNo)===Number(lineNo))||null;
  }
  function wwPickingPriceTotalV1526(requestId,lines){
    return (lines||[]).reduce((total,l)=>{
      const p=wwPickingPriceV1526(requestId,l.lineNo);
      return total+Math.max(0,Number(l.approvedQtyUnit||0))*Math.max(0,Number(p&&p.unitPrice||0));
    },0);
  }
  function wwPickingReportForPrintV1525(id){
    const r=wwPickingReportV1525.get(String(id));
    if(!r||!r.checked||r.status!=='DRAFT'||!Array.isArray(r.lines)||!r.lines.length)
      return null;
    const price=wwPickingPricesV1526.get(String(id));
    if(!price||!Array.isArray(price.lines)||price.lines.length!==r.lines.length)return null;
    if(r.lines.some(l=>Number(l.approvedQtyUnit||0)>0&&!(Number(wwPickingPriceV1526(id,l.lineNo)?.unitPrice||0)>0)))return null;
    return r;
  }
  function wwPickingStatusV1525(l){
    const sent=Number(l.approvedQtyUnit||0),asked=Number(l.requestedQtyUnit||0);
    return sent<=0?'KOSONG':sent<asked-0.000001?'SEBAGIAN':'TERSEDIA';
  }
  function wwPickingPrintLinesV1525(requestId){
    const checked=wwPickingReportForPrintV1525(requestId);
    if(!checked) {
      toast('Simpan dahulu hasil cek fisik bahan, termasuk kekurangan, sebelum mencetak.','warning');
      return null;
    }
    return checked.lines;
  }
  function opsRequestDetailV43(requestId) {
    const req=opsRequestV43(requestId);
    if(!req)return toast('Permintaan belum ada di snapshot. Perbarui Permintaan dahulu.');
    const id=String(requestId);
    wwPickingReportV1525.delete(id);wwPickingPricesV1526.delete(id);
    sheetHtml('Cek Ketersediaan Bahan Outlet',
      '<div class="ww-ops-request-meta"><strong>'+esc(req.outletName||req.outletCode||'-')+'</strong>'+
      '<span>Permintaan '+esc(req.requestId||'-')+' · '+esc(displayDateShort(req.requestDate||req.createdAt))+'</span>'+
      '<span>Dibutuhkan '+esc(displayDateShort(req.needDate))+
      ' · SJ '+esc(req.linkedNoSj||'belum tersinkron')+'</span></div>'+
      '<div class="ww-preprint-check"><div class="ww-preprint-head"><b>1. Cek & Catat Barang Gudang</b>'+
      '<span>Isi jumlah nyata yang bisa disiapkan</span></div>'+
      '<p>Isi 0 bila kosong. Jika hanya tersedia sebagian, isi jumlah yang bisa dikirim serta alasannya. Ini belum mengurangi stok.</p>'+
      '<form id="wwPickingFormV1525"><div id="wwPickingContentV1525" class="ww-preprint-results" role="status"><span class="ww-spin-v1526" aria-hidden="true"></span> Memuat rincian bahan, harga, dan status DRAFT…</div>'+
      '<button class="btn btn-primary" id="wwPickingSaveV1525" type="submit" disabled>Simpan Hasil Pemeriksaan</button></form></div>'+
      '<div class="ww-preprint-head"><b>2. Cetak Hasil Pemeriksaan</b><span>Setelah tersimpan</span></div>'+
      '<div id="wwPickingSavedStateV1525" class="ww-preprint-results">Cetak terkunci sebelum pemeriksaan tersimpan.</div>'+
      '<div class="actions"><button type="button" class="btn btn-line" id="opsV43RequestBack">Kembali</button>'+
      '<button type="button" class="btn btn-soft" id="opsV43RequestThermal" disabled>Cetak Thermal</button>'+
      '<button type="button" class="btn btn-soft" id="opsV43RequestPrint" disabled>Cetak A4</button></div>'+
      '<div class="ww-preprint-head"><b>3. Pengiriman</b><span>Setelah hasil pemeriksaan tersimpan</span></div>'+
      '<div class="actions"><button type="button" class="btn btn-primary" id="wwPickingGoDeliveryV15210" disabled>Lanjut ke Konfirmasi Kirim</button></div>',
      {key:'request-detail-v43:'+id});
    const root=$('#wwPickingContentV1525'),form=$('#wwPickingFormV1525'),save=$('#wwPickingSaveV1525'),
      status=$('#wwPickingSavedStateV1525'),thermal=$('#opsV43RequestThermal'),print=$('#opsV43RequestPrint'),
      goDelivery=$('#wwPickingGoDeliveryV15210');
    const returnToSjV15210=()=>{
      const sjId=String((source&&source.sjId)||req.linkedSjId||req.sjId||'');
      const sj=((state.data||{}).deliveries||[]).find(x=>String(x.sjId)===sjId);
      if(sj)directDeliveryDetail(sj.sjId);else directDelivery();
    };
    $('#opsV43RequestBack').onclick=returnToSjV15210;
    goDelivery.onclick=returnToSjV15210;
    const printAndRecord=async(format)=>{
      const issued=format==='THERMAL'?opsPrintRequestThermalV43(requestId):opsPrintRequestV43(requestId);
      if(issued===false)return;
      try{
        await withBusy('Mencatat perintah cetak…',()=>bridge.call('markWarehousePickingPrintRequestedV1526',state.token,
          {requestId:id,sjId:source&&source.sjId,reviewId:source&&source.reviewId,format},idemKey('print_'+format+'_'+id.length+'_'+id.slice(-9))));
        wwQueueV1526=null;
        status.textContent='Perintah cetak '+format+' telah dicatat. Surat Jalan tetap DRAFT sampai dikonfirmasi Kirim.';
      }catch(err){toast('Perintah cetak terbuka, tetapi status cetak belum tercatat: '+err.message,'warning')}
    };
    thermal.onclick=()=>printAndRecord('THERMAL');
    print.onclick=()=>printAndRecord('A4');
    const togglePrint=()=>{
      const allowed=!!wwPickingReportForPrintV1525(requestId);
      thermal.disabled=!allowed;print.disabled=!allowed;
    };
    let source=null,loading=false;
    const render=report=>{
      source=report;const adminLocked=!!report.lockedForStaff&&currentRole()!=='OWNER';
      goDelivery.disabled=true;
      if(report.status!=='DRAFT'){
        root.textContent='Surat Jalan sudah berstatus '+report.status+'. Pemeriksaan tidak boleh diubah setelah pengiriman.';
        save.disabled=true;return;
      }
      const pricing=wwPickingPricesV1526.get(id);
      const notes=report.lines.map(l=>{
        const qty=Number(l.approvedQtyUnit),price=wwPickingPriceV1526(id,l.lineNo);
        return '<div class="direct-card ww-pick-review-row" data-ww-pick-line="'+Number(l.lineNo)+'" data-ww-pick-code="'+esc(l.code)+'">'+
          '<div class="ww-pick-item-head"><div><b>'+esc(l.name)+'</b><small>Diminta '+num(Number(l.requestedQtyUnit))+' '+esc(l.sendUnit)+'</small></div>'+ 
          '<span class="ww-pick-stage '+(qty<=0?'is-short':qty<Number(l.requestedQtyUnit)?'is-partial':'is-ready')+'">'+esc(wwPickingStatusV1525(l))+'</span></div>'+ 
          '<div class="ww-pick-price"><b>Harga internal SJ: '+(price&&Number(price.unitPrice)>0?rp(Number(price.unitPrice)):'BELUM DIATUR')+' / '+esc(l.sendUnit)+'</b>'+ 
          (price&&price.changed?'<small>Harga Pusat terbaru '+rp(Number(price.effectiveMasterPrice))+' berbeda. Harga SJ tetap mengikuti snapshot; konfirmasi Owner sebelum merevisi.</small>':'')+'</div>'+
          '<label class="field"><span>Jumlah disiapkan (0 = stok kosong)</span>'+
          '<input type="number" class="ww-pick-qty" min="0" max="'+Number(l.requestedQtyUnit)+'" step="0.000001" required value="'+qty+'"></label>'+
          '<label class="field"><span>Alasan jika kurang atau kosong</span>'+
          '<textarea class="ww-pick-reason" placeholder="Contoh: stok kosong / belum packing">'+esc(l.reason||'')+'</textarea></label>'+
          '<small class="ww-pick-row-status">'+esc(wwPickingStatusV1525(l))+'</small></div>';
      }).join('');
      root.innerHTML='<div class="ww-preprint-summary">'+
        (adminLocked?'<b>HASIL CEK DIKUNCI</b> · Admin dapat mencetak ulang. Jika ada selisih setelah disimpan, laporkan kepada Owner untuk koreksi.<br>':'')+
        (pricing&&pricing.hasMissing?'<b>Perhatian: Ada harga SJ belum diatur. Cetak bernilai terkunci jika barang tersebut disiapkan.</b><br>':'')+
        (pricing&&pricing.hasChanged?'<small>Harga supplier/Pusat terbaru berbeda dari snapshot SJ. Tidak ada penggantian harga otomatis pada SJ lama.</small><br>':'')+
        (report.checked?'Hasil pemeriksaan sebelumnya ditemukan; boleh dicetak atau diperbarui.':'Belum ada pemeriksaan tersimpan. Sesuaikan jumlah nyata lalu simpan.')+
        '</div>'+notes;
      save.disabled=adminLocked||!report.lines.length;
      if(adminLocked)$$('.ww-pick-qty,.ww-pick-reason',root).forEach(input=>{input.disabled=true;input.setAttribute('aria-readonly','true')});
      const update=()=>{
        if(wwPickingReportV1525.has(id)){
          wwPickingReportV1525.delete(id);togglePrint();
          goDelivery.disabled=true;
          status.textContent='Ada perubahan yang belum disimpan. Simpan kembali sebelum cetak.';
        }
        $$('[data-ww-pick-line]',root).forEach(card=>{
          const qty=Number(card.querySelector('.ww-pick-qty').value||0);
          const max=Number(card.querySelector('.ww-pick-qty').max||0);
          const stage=qty<=0?'KOSONG':qty<max-0.000001?'SEBAGIAN':'TERSEDIA';
          card.querySelector('.ww-pick-row-status').textContent=stage;
          const chip=card.querySelector('.ww-pick-stage');chip.textContent=stage;
          chip.className='ww-pick-stage '+(qty<=0?'is-short':qty<max-0.000001?'is-partial':'is-ready');
        });
      };
      $$('[data-ww-pick-line]',root).forEach(card=>{
        card.querySelector('.ww-pick-qty').addEventListener('input',update);
        card.querySelector('.ww-pick-reason').addEventListener('input',update);
      });
      if(report.checked){
        wwPickingReportV1525.set(id,report);togglePrint();
        goDelivery.disabled=!((state.data||{}).deliveries||[]).some(x=>String(x.sjId)===String(report.sjId||req.linkedSjId||req.sjId||''));
        status.textContent='Tersimpan oleh '+(report.reviewedBy||'staf gudang')+
          ' · '+(report.reviewedAt||'')+'. Struk menampilkan jumlah disiapkan & kekurangannya.';
      }
    };
    // Both reads are read-only; form remains locked if price or SJ cannot be verified.
    withBusy('Membaca permintaan, stok terverifikasi, dan harga internal…',async()=>{
      const [report,price]=await Promise.all([
        bridge.call('getWarehouseRequestAvailabilityV1525',state.token,id),
        bridge.call('getWarehousePickingPricesV1526',state.token,id)
      ]);
      if(!price||price.ok!==true||!Array.isArray(price.lines))throw Error('Harga SJ belum bisa diverifikasi.');
      wwPickingPricesV1526.set(id,price);render(report);
    }).catch(err=>{
      root.textContent='Pemeriksaan belum dapat dibuka: '+String(err&&err.message||err)+
        '. Pastikan add-on pemeriksaan dan izin Bridge sudah di-deploy. Cetak tetap terkunci.';
      save.disabled=true;togglePrint();
    });
    form.onsubmit=async e=>{
      e.preventDefault();
      if(loading||!source||source.status!=='DRAFT')return;
      if(source.lockedForStaff&&currentRole()!=='OWNER')return toast('Hasil cek sudah dikunci. Admin tidak bisa merevisi. Hubungi Owner.','warning');
      const rows=$$('[data-ww-pick-line]',root);
      if(!rows.length)return toast('Belum ada bahan untuk diperiksa.','warning');
      const items=[],errors=[];
      rows.forEach(card=>{
        const lineNo=Number(card.dataset.wwPickLine),code=card.dataset.wwPickCode,
          ref=source.lines.find(l=>Number(l.lineNo)===lineNo),raw=card.querySelector('.ww-pick-qty').value.trim(),
          approved=Number(raw),reason=card.querySelector('.ww-pick-reason').value.trim(),
          requested=Number(ref&&ref.requestedQtyUnit);
        if(!ref||!raw||!Number.isFinite(approved)||approved<0||approved>requested+0.000001)
          errors.push((ref&&ref.name||code)+': jumlah 0 sampai '+requested+' wajib diisi');
        else if(approved<requested-0.000001&&reason.length<3)
          errors.push((ref&&ref.name||code)+': alasan kekurangan/kosong wajib diisi');
        items.push({lineNo,code,approvedQtyUnit:raw,reason:reason});
      });
      if(errors.length)return toast(errors.slice(0,2).join(' • '),'warning');
      loading=true;save.disabled=true;thermal.disabled=true;print.disabled=true;beginBusy('Menyimpan hasil pemeriksaan…');
      wwPickingReportV1525.delete(id);
      status.textContent='Menyimpan keputusan ketersediaan ke DRAFT SJ…';
      try{
        // The server validates every SJ line, role, idempotency and DRAFT status.
        const safePickAction='pick_'+Array.from(id).reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(16)+'_'+id.length;
        const result=await bridge.call('saveWarehouseRequestAvailabilityV1525',state.token,
          {requestId:id,sjId:source.sjId,items:items},idemKey(safePickAction));
        if(!result||result.ok!==true)throw new Error('Simpan pemeriksaan belum terkonfirmasi.');
        localStorage.removeItem('ww_gh_idem_'+safePickAction);
        const fresh=await bridge.call('getWarehouseRequestAvailabilityV1525',state.token,id);
        if(!fresh||!fresh.checked)throw new Error('Sudah tersimpan tetapi pemeriksaan terbaru belum terverifikasi. Buka ulang rincian.');
        render(fresh);wwQueueV1526=null;
        toast('Cek ketersediaan tersimpan. Barang kosong/sebagian tercatat di SJ.','success');
        reloadDeliveryModule().catch(()=>{});
      }catch(err){
        wwPickingReportV1525.delete(id);togglePrint();
        status.textContent='Belum berhasil dikonfirmasi: '+String(err&&err.message||err)+
          '. Jangan klik simpan ulang jika status tidak pasti. Buka ulang rincian & periksa hasilnya.';
        toast('Simpan belum terverifikasi; cetak tetap terkunci.','warning');
      }finally{loading=false;save.disabled=!!(source&&source.lockedForStaff&&currentRole()!=='OWNER');endBusy();}
    };
  }
  function opsPrintRequestThermalV43(requestId) {
    const req=opsRequestV43(requestId),lines=wwPickingPrintLinesV1525(requestId);
    if(!req||!lines)return false;
    const report=wwPickingReportForPrintV1525(requestId);
    const width=Number(localStorage.getItem('ww_thermal_width'))===48?48:32,hr='-'.repeat(width),parts=[];
    parts.push(centerThermal('WILLS COFFEE',width),centerThermal('CEK KETERSEDIAAN OUTLET',width),hr);
    ['Outlet: '+(req.outletName||req.outletCode||'-'),
     'Permintaan: '+(req.requestId||'-'),
     'SJ DRAFT: '+(report.noSj||req.linkedNoSj||'-'),
     'Dibutuhkan: '+displayDateShort(req.needDate)].forEach(line=>
        wrapThermal(line,width).forEach(x=>parts.push(x)));
    parts.push(hr);
    lines.forEach((l,i)=>{
      const ask=Number(l.requestedQtyUnit||0),ready=Number(l.approvedQtyUnit||0);
      wrapThermal((i+1)+'. '+l.name,width).forEach(x=>parts.push(x));
      [
        'Diminta: '+num(ask)+' '+l.sendUnit,
        'Disiapkan: '+num(ready)+' '+l.sendUnit,
        'Tidak dikirim: '+num(Math.max(0,ask-ready))+' '+l.sendUnit,
        'Harga: '+(wwPickingPriceV1526(requestId,l.lineNo)?rp(wwPickingPriceV1526(requestId,l.lineNo).unitPrice):'BELUM DIATUR')+'/'+l.sendUnit,
        'Subtotal: '+rp(ready*Number(wwPickingPriceV1526(requestId,l.lineNo)?.unitPrice||0)),
        'Status: '+wwPickingStatusV1525(l)
      ].forEach(x=>wrapThermal(x,width).forEach(y=>parts.push(y)));
      if(l.reason)wrapThermal('Alasan: '+l.reason,width).forEach(x=>parts.push(x));
      parts.push('');
    });
    parts.push(hr,'TOTAL NILAI SIAP: '+rp(wwPickingPriceTotalV1526(requestId,lines)),'Harga internal snapshot SJ',
      'Diperiksa: _______________','BUKAN BUKTI PENGIRIMAN','','');
    printRawBt(parts.join('\n'));return true;
  }
  function opsPrintRequestV43(requestId) {
    const req=opsRequestV43(requestId),lines=wwPickingPrintLinesV1525(requestId);
    if(!req||!lines)return false;
    const checked=wwPickingReportForPrintV1525(requestId);
    const rows=lines.map((l,i)=>{
      const ask=Number(l.requestedQtyUnit||0),ready=Number(l.approvedQtyUnit||0);
      return '<tr><td>'+(i+1)+'</td><td>'+esc(l.name)+'<small>'+esc(l.code)+'</small></td>'+
        '<td class="right">'+num(ask)+'</td><td class="right">'+num(ready)+'</td>'+
        '<td class="right">'+num(Math.max(0,ask-ready))+'</td>'+
        '<td>'+esc(l.sendUnit)+'</td><td class="right">'+ 
        (wwPickingPriceV1526(requestId,l.lineNo)?rp(wwPickingPriceV1526(requestId,l.lineNo).unitPrice):'-')+
        '</td><td class="right">'+rp(ready*Number(wwPickingPriceV1526(requestId,l.lineNo)?.unitPrice||0))+'</td>'+ 
        '<td>'+esc(wwPickingStatusV1525(l))+'</td>'+
        '<td>'+esc(l.reason||'-')+'</td></tr>';
    }).join('');
    const html='<!doctype html><html lang="id"><head><meta charset="utf-8">'+
      '<title>Cek Ketersediaan Bahan Outlet</title><style>'+
      '@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:10px/1.45 Arial,sans-serif;color:#222;margin:0}'+
      'h1{font-size:18px;color:#a3182f;margin:0}p{margin:3px 0 12px;color:#555}'+
      'table{width:100%;border-collapse:collapse}th,td{padding:7px 5px;border:1px solid #bbb;text-align:left;vertical-align:top}'+
      'th{background:#f2e7ea}td small{display:block;color:#777}.right{text-align:right}'+
      '.sign{display:flex;justify-content:space-between;margin-top:38px}.sign div{width:40%;border-top:1px solid #555;padding-top:7px;text-align:center}'+
      '</style></head><body><h1>WILLS COFFEE</h1><p>WAREHOUSE · HASIL CEK KETERSEDIAAN BAHAN OUTLET</p>'+
      '<p><b>Outlet:</b> '+esc(req.outletName||req.outletCode||'-')+
      ' · <b>No Permintaan:</b> '+esc(req.requestId||'-')+
      ' · <b>SJ:</b> '+esc(checked.noSj||req.linkedNoSj||'-')+
      ' · <b>Diperiksa:</b> '+esc(checked.reviewedBy||'-')+
      ' · '+esc(checked.reviewedAt||'-')+'</p>'+
      '<table><thead><tr><th>No.</th><th>Bahan</th><th>Diminta</th><th>Disiapkan</th>'+
      '<th>Tidak Dikirim</th><th>Satuan</th><th>Harga/Unit</th><th>Subtotal</th><th>Status</th><th>Alasan</th></tr></thead><tbody>'+
      rows+'</tbody></table><p><b>Total nilai bahan disiapkan: '+rp(wwPickingPriceTotalV1526(requestId,lines))+'</b></p>'+
      '<p>Dokumen pengecekan bukan bukti pengiriman. Stok hanya berkurang saat Surat Jalan dikonfirmasi Kirim.</p>'+
      '<div class="sign"><div>Staf Gudang</div><div>Pemeriksa / Penerima</div></div></body></html>';
    const win=window.open('','_blank','width=920,height=900');
    if(!win){toast('Pop-up cetak diblokir. Izinkan pop-up aplikasi Warehouse.');return false;}
    win.document.open();win.document.write(html);win.document.close();win.focus();
    setTimeout(()=>{try{win.print()}catch(err){toast('Gagal membuka cetak: '+err.message)}},200);return true;
  }

  let wwSelectedOutletV1522='',wwQueueV1526=null,wwQueuePromiseV1526=null,wwQueueErrorV1526='',wwQueueFetchedAtV1526=0;
  function wwRequestOutletV1522(x){
    const code=String(x.outletCode||x.code||'').trim().toUpperCase();
    return code==='TGM'?'TM':(code||'LAINNYA');
  }
  function wwRequestStageV1526(req){
    const s=String(req&&req.sjStatus||'').toUpperCase();
    if(s==='DRAFT'||!s)return 'PREPARE';
    return ['SELESAI','DIBATALKAN'].includes(s)?'HISTORY':'IN_TRANSIT';
  }
  function wwReloadQueueV1526(force=false){
    if(wwQueuePromiseV1526)return wwQueuePromiseV1526;
    if(!force&&wwQueueV1526)return Promise.resolve(wwQueueV1526);
    wwQueuePromiseV1526=withBusy('Menyinkronkan status permintaan & Surat Jalan…',async()=>{
      const out=await bridge.call('getWarehouseRequestLifecycleV1526',state.token);
      if(!out||out.ok!==true||!Array.isArray(out.rows))throw Error('Daftar status canonical belum tersedia.');
      wwQueueV1526=out;wwQueueErrorV1526='';wwQueueFetchedAtV1526=Date.now();
      return out;
    }).catch(err=>{wwQueueErrorV1526=String(err&&err.message||err);throw err;}).finally(()=>{
      wwQueuePromiseV1526=null;
      if(currentSheetKey()==='delivery-list')directDelivery(false);
    });
    return wwQueuePromiseV1526;
  }
  function wwRequestProgressCardV1526(x){
    const g=x.group||wwRequestStageV1526(x);
    return '<button type="button" class="direct-card direct-click ww-request-item" data-ww-progress-id="'+esc(x.requestId)+'">'+
      '<b>'+esc(x.outletName||x.outletCode||'-')+' · '+esc(x.noSj||x.linkedNoSj||'-')+'</b>'+
      '<small>'+esc(displayDateShort(x.requestDate||x.createdAt))+' · '+num(x.itemCount||0,0)+' bahan</small>'+
      '<span class="badge '+(g==='HISTORY'?'ok':'warn')+'">'+esc(x.warehouseStatus||x.sjStatus||'-')+'</span></button>';
  }
  function wwRequestLifecycleDetailV1526(requestId){
    const x=(wwQueueV1526&&wwQueueV1526.rows||[]).find(t=>String(t.requestId)===String(requestId));
    if(!x)return toast('Riwayat permintaan belum tersedia. Perbarui permintaan.','warning');
    const st=String(x.sjStatus||''),labels=['DRAFT','DIKIRIM','DITERIMA','SELESAI'],done=st==='SELESAI'?3:
      st==='DITERIMA'?2:st==='DITERIMA_SEBAGIAN'?2:
      ['DIKIRIM','SELISIH'].includes(st)?1:0;
    const steps=labels.map((label,i)=>'<div class="ww-life-step '+(i<=done?'done':'')+'"><span>'+
      (i<=done?'✓':String(i+1))+'</span><b>'+label+'</b></div>').join('');
    sheetHtml('Status Permintaan Outlet',
      '<div class="ww-ops-request-meta"><strong>'+esc(x.outletName||x.outletCode)+'</strong>'+
      '<span>Permintaan '+esc(x.requestId)+' · SJ '+esc(x.noSj||'-')+'</span>'+
      '<span>'+esc(displayDateShort(x.requestDate))+' · '+esc(x.warehouseStatus||st)+'</span></div>'+
      '<div class="ww-life-track">'+steps+'</div>'+
      '<div class="ww-preprint-summary">Status Surat Jalan canonical: <b>'+esc(st||'BELUM ADA SJ')+
      '</b>. Tidak semua status berarti penerimaan selesai. SELISIH dan DIBATALKAN memerlukan pemeriksaan tersendiri.</div>'+
      '<button class="btn btn-line" id="wwLifeBackV1526">Kembali ke Permintaan</button>',{key:'request-lifecycle:'+requestId});
    $('#wwLifeBackV1526').onclick=directDelivery;
  }

  // v1.5.2.8: merge read-only canonical queue and fresh delivery module; no writes.
  function wwVisibleQueueV1528(){
    const canonical=Array.isArray(wwQueueV1526&&wwQueueV1526.rows)?wwQueueV1526.rows:[];
    const group=x=>{
      const st=String(x.sjStatus||'').toUpperCase();
      if(st==='DRAFT'||st==='MISSING_SJ')return 'PREPARE';
      if(['SELESAI','DIBATALKAN'].includes(st))return 'HISTORY';
      if(st&&st!=='UNKNOWN')return 'IN_TRANSIT';
      return ['PREPARE','IN_TRANSIT','HISTORY'].includes(String(x.group||'').toUpperCase())?String(x.group).toUpperCase():'IN_TRANSIT';
    };
    const all=new Map();
    canonical.forEach(r=>{if(r&&r.requestId)all.set(String(r.requestId),{...r,group:group(r)});});
    const data=state.data||{},deliveries=data.deliveries||[];
    const byId=new Map(),byNo=new Map();
    deliveries.forEach(x=>{if(x.sjId)byId.set(String(x.sjId),x);if(x.noSj)byNo.set(String(x.noSj),x);});
    (data.incomingRequests||[]).forEach(r=>{
      if(!r||!r.requestId||all.has(String(r.requestId)))return;
      const k=String(r.needDate||r.requestDate||'').slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(k) || k<new Date(Date.now()-12*86400000).toISOString().slice(0,10))return;
      const linkedId=String(r.linkedSjId||''),linkedNo=String(r.linkedNoSj||'');
      const sj=byId.get(linkedId)||byNo.get(linkedNo);
      const st=sj?String(sj.status||'').toUpperCase():(linkedId||linkedNo?'UNKNOWN':'MISSING_SJ');
      if(['UNKNOWN','SELESAI','DIBATALKAN'].includes(st))return;
      const row={...r,sjStatus:st,noSj:(sj&&sj.noSj)||linkedNo,group:group({sjStatus:st})};
      all.set(String(r.requestId),row);
    });
    const dateKey=x=>{
      const v=String(x.needDate||x.requestDate||x.createdAt||'');
      return /^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10).replaceAll('-',''):/^\d{2}\/\d{2}\/\d{4}/.test(v)?v.slice(6,10)+v.slice(3,5)+v.slice(0,2):'';
    };
    return [...all.values()].sort((a,b)=>dateKey(b).localeCompare(dateKey(a))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }
  // UI only: active SJ first, newest within each state, filtered by outlet (TGM -> TM).
  // SJ badges count DRAFT only; historical SJ remain visible for audit/reprint.
  function wwDraftSjCountV15211(deliveries,outletCode='ALL'){
    const code=String(outletCode||'ALL').trim().toUpperCase();
    return (Array.isArray(deliveries)?deliveries:[]).filter(x=>
      x&&x.sjId&&String(x.status||'').trim().toUpperCase()==='DRAFT'&&
      (code==='ALL'||wwRequestOutletV1522(x)===code)).length;
  }
  function wwRecentSjForOutletV15210(deliveries,outletCode){
    const code=String(outletCode||'ALL').toUpperCase();
    const rows=(Array.isArray(deliveries)?deliveries:[]).filter(d=>
      d&&d.sjId&&d.noSj&&(code==='ALL'||wwRequestOutletV1522(d)===code));
    const priority=d=>{
      const st=String(d.status||'').toUpperCase();
      return st==='DRAFT'?0:['DIKIRIM','DITERIMA','DITERIMA_SEBAGIAN','SELISIH'].includes(st)?1:2;
    };
    const created=d=>{
      const date=Date.parse(String(d.createdAt||d.shipDate||''));
      return Number.isFinite(date)?date:0;
    };
    return rows.sort((a,b)=>priority(a)-priority(b)||created(b)-created(a)||
      String(b.noSj||'').localeCompare(String(a.noSj||''))).slice(0,30);
  }
  function directDelivery(load=true){
    const d=state.data||{},canonical=wwQueueV1526&&Array.isArray(wwQueueV1526.rows),
      all=wwVisibleQueueV1528(),visible=canonical||all.length>0,req=all.filter(x=>x.group==='PREPARE'),
      progress=all.filter(x=>x.group==='IN_TRANSIT'),
      history=all.filter(x=>x.group==='HISTORY'),rows=d.deliveries||[];
    const tools=[];
    if(roleCan('DELIVERY_CREATE'))tools.push('<button class="btn btn-primary" id="ghNewSj">+ SJ Manual</button>');
    if(roleCan('REQUEST_SYNC'))tools.push('<button class="btn btn-soft" id="ghSyncReq">Perbarui Permintaan</button>');
    if(roleCan('DELIVERY_SYNC'))tools.push('<button class="btn btn-primary" id="ghSyncRec">Sinkron Penerimaan</button>');
    if(canAny('AUDIT_OPERATIONAL','DELIVERY_SYNC'))tools.push('<button class="btn btn-line" id="ghDiag">Diagnostik</button>');
    const grouped=new Map();
    (d.outlets||[]).filter(x=>x.active==='YA').forEach(x=>{
      const code=wwRequestOutletV1522(x);
      if(!grouped.has(code))grouped.set(code,{name:x.name||code,rows:[]});
    });
    rows.filter(x=>x&&x.sjId).forEach(x=>{
      const code=wwRequestOutletV1522(x);
      if(!grouped.has(code))grouped.set(code,{name:x.outletName||code,rows:[]});
      grouped.get(code).rows.push(x);
    });
    req.forEach(x=>{
      const code=wwRequestOutletV1522(x);
      if(!grouped.has(code))grouped.set(code,{name:x.outletName||code,rows:[]});
    });
    grouped.set('ALL',{name:'Semua Outlet',rows:rows.filter(x=>x&&x.sjId)});
    const order=['ALL','RB','TM','UPI','CPK','CPS'];
    const keys=[...grouped.keys()].sort((a,b)=>{
      const ia=order.indexOf(a),ib=order.indexOf(b);
      return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);
    });
    if(!grouped.has(wwSelectedOutletV1522))wwSelectedOutletV1522='ALL';
    const menu=keys.map(k=>'<button type="button" class="ww-request-tab '+(k===wwSelectedOutletV1522?'is-active':'')+
      '" data-ww-request-outlet="'+esc(k)+'" aria-pressed="'+(k===wwSelectedOutletV1522)+'">'+
      '<span>'+esc(k)+'</span><b>'+num(wwDraftSjCountV15211(grouped.get(k).rows),0)+'</b></button>').join('');
    const selected=grouped.get(wwSelectedOutletV1522),
      entries=wwRecentSjForOutletV15210(rows,wwSelectedOutletV1522),
      knownSjIds=new Set(rows.map(x=>String(x&&x.sjId||'')).filter(Boolean)),
      knownSjNos=new Set(rows.map(x=>String(x&&x.noSj||'')).filter(Boolean)),
      missing=req.filter(x=>(wwSelectedOutletV1522==='ALL'||wwRequestOutletV1522(x)===wwSelectedOutletV1522)&&
        (String(x.sjStatus||'').toUpperCase()==='MISSING_SJ'||(
          !knownSjIds.has(String(x.sjId||x.linkedSjId||''))&&
          !knownSjNos.has(String(x.noSj||x.linkedNoSj||''))))),
      requests=missing.map(x=>'<button class="direct-card direct-click ww-ops-request-card ww-request-item" type="button" data-request-id="'+esc(x.requestId)+'">'+
        '<b>'+esc(x.outletName||x.outletCode||'-')+' · '+esc(displayDateShort(x.needDate))+'</b>'+
        '<small>'+esc(displayDateShort(x.requestDate||x.createdAt))+' · '+num(x.itemCount||0,0)+' bahan · '+
        esc(x.noSj||x.linkedNoSj||'SJ belum tersedia')+'</small><span class="badge warn">'+
        esc(x.warehouseStatus||'MENUNGGU DISIAPKAN')+'</span>'+
        '<span class="ww-request-item-link">Periksa Permintaan ›</span></button>').join(''),
      sj=entries.map(x=>{
        const pending=String(x.status||'').toUpperCase()==='DRAFT'&&dispatchPendingV44(x.sjId);
        const action=pending?'Cek Status Kirim':String(x.status||'').toUpperCase()==='DRAFT'?
          'Periksa Bahan · Konfirmasi Kirim':'Lihat Detail SJ';
        return '<button class="direct-card direct-click ww-ops-request-card ww-request-item" type="button" data-sjid="'+esc(x.sjId)+'">'+
          '<b>'+esc(x.noSj)+' · '+esc(x.outletName||x.outletCode||'-')+'</b>'+
          '<small>'+esc(displayDateShort(x.shipDate||x.createdAt))+' · '+num((x.lines||[]).length,0)+' bahan</small>'+
          deliveryStatusBadge(x.status)+'<span class="ww-request-item-link">'+esc(action)+' ›</span></button>';
      }).join('');
    const loader=!canonical?'<div class="ww-queue-loading"><span class="ww-spin-v1526" aria-hidden="true"></span><span>'+
      (wwQueueErrorV1526?'Status terbaru belum terbaca: '+esc(wwQueueErrorV1526)+' · ketuk Muat Ulang':'Menyinkronkan status Surat Jalan terbaru…')+
      '</span><button class="btn btn-soft" id="wwQueueRetryV1526" type="button">Muat Ulang</button></div>':'';
    const n={PREPARE:req.length,IN_TRANSIT:progress.length,HISTORY:history.length};
    sheetHtml('Bahan yang Harus Dikirim Sekarang',
      '<div class="ww-request-top"><b>Surat Jalan Terbaru</b><span>'+
      num(wwDraftSjCountV15211(entries),0)+' DRAFT</span></div>'+
      loader+
      (wwQueueErrorV1526?'<div class="ww-dispatch-pending-note" role="status">Pembacaan status SJ belum berhasil: '+esc(wwQueueErrorV1526)+'. Data modul Warehouse ditampilkan sementara; jangan buat SJ ganda.</div>':'')+
      '<div class="ww-request-tabs" role="group" aria-label="Pilih outlet">'+(menu||'Belum ada outlet aktif')+'</div>'+
      '<div class="ww-request-section"><div class="ww-request-section-head"><b>'+esc(selected?selected.name:'Semua Outlet')+
      '</b><span>'+num(wwDraftSjCountV15211(entries),0)+' DRAFT</span></div><div class="ww-request-scroll">'+
      (sj||'<div class="empty">Belum ada Surat Jalan pada outlet ini. Ketuk Muat Ulang bila perlu.</div>')+'</div></div>'+
      '<div class="ww-life-note">Pilih SJ DRAFT untuk Periksa Bahan / Cetak Thermal dan Konfirmasi Kirim. Stok hanya berkurang setelah pengiriman dikonfirmasi.</div>'+
      (missing.length?'<details class="ww-sj-collapse"><summary>Permintaan Belum Ada SJ <span>'+num(missing.length,0)+' permintaan</span></summary>'+
        '<div class="direct-list">'+requests+'</div></details>':'')+
      '<details class="ww-sj-collapse"><summary>Dalam Pengiriman / Penerimaan <span>'+num(n.IN_TRANSIT||0,0)+' permintaan</span></summary>'+
      '<div class="direct-list">'+progress.map(wwRequestProgressCardV1526).join('')+'</div></details>'+
      '<details class="ww-sj-collapse"><summary>Riwayat Selesai / Batal <span>'+num(n.HISTORY||0,0)+' permintaan</span></summary>'+
      '<div class="direct-list">'+history.map(wwRequestProgressCardV1526).join('')+
      '<small>Menampilkan 60 riwayat terbaru. Data lama tetap tersimpan.</small></div></details>'+
      (tools.length?'<details class="ww-sj-collapse ww-request-actions"><summary>Aksi Gudang <span>Sinkronisasi · Surat Jalan manual · Diagnostik</span></summary>'+
        '<div class="direct-toolbar">'+tools.join('')+'</div></details>':''),
      {key:'delivery-list'});
    const newSj=$('#ghNewSj');if(newSj)newSj.onclick=directNewSj;
    const syncReq=$('#ghSyncReq');if(syncReq)syncReq.onclick=async()=>{
      try{await withBusy('Memperbarui permintaan…',async()=>{await callDirect('syncOutletMaterialRequestsNowV1250');await reloadDeliveryModule();wwQueueV1526=null;await wwReloadQueueV1526(true)});toast('Permintaan disinkronkan.');}
      catch(e){toast(e.message,'warning')}
    };
    const syncRec=$('#ghSyncRec');if(syncRec)syncRec.onclick=async()=>{
      try{await withBusy('Sinkron penerimaan…',async()=>{await callDirect('syncOutletReceipts');await reloadDeliveryModule();wwQueueV1526=null;await wwReloadQueueV1526(true)});toast('Penerimaan diperbarui.')}
      catch(e){toast(e.message,'warning')}
    };
    const diag=$('#ghDiag');if(diag)diag.onclick=async()=>{try{const z=await withBusy('Diagnostik…',()=>callDirect('auditReceiptSyncDiagnosticAppV1260'));showDiagnostic(z)}catch(e){toast(e.message,'warning')}};
    $$('[data-ww-request-outlet]').forEach(b=>b.onclick=()=>{wwSelectedOutletV1522=b.dataset.wwRequestOutlet;directDelivery(false)});
    $$('[data-request-id]').forEach(b=>b.onclick=()=>{const x=(wwQueueV1526&&wwQueueV1526.rows||[]).find(q=>String(q.requestId)===b.dataset.requestId);if(x&&x.sjStatus==='MISSING_SJ')wwRequestLifecycleDetailV1526(x.requestId);else opsRequestDetailV43(b.dataset.requestId)});
    $$('[data-ww-progress-id]').forEach(b=>b.onclick=()=>wwRequestLifecycleDetailV1526(b.dataset.wwProgressId));
    $$('[data-sjid]').forEach(b=>b.onclick=()=>directDeliveryDetail(b.dataset.sjid));
    const retry=$('#wwQueueRetryV1526');if(retry)retry.onclick=async()=>{try{await reloadDeliveryModule();await wwReloadQueueV1526(true);}catch(e){toast(e.message,'warning');directDelivery(false);}};
    if(load&&(!canonical||Date.now()-wwQueueFetchedAtV1526>30000)&&!wwQueuePromiseV1526)
      wwReloadQueueV1526(true).catch(e=>toast('Status canonical belum tersedia: '+e.message,'warning'));
  }

  function directDraftPrintList(){
    const rows=((state.data||{}).deliveries||[]).filter(x=>String(x.status||'')==='DRAFT');
    sheetHtml('Draft Siap Kirim',`<p>Pilih draft yang sudah disiapkan. Checklist ini dicetak ke thermal Bluetooth dan dibawa bersama barang untuk pengecekan barista.</p><div class="direct-list">${rows.map(x=>`<button class="direct-card direct-click" data-print-sjid="${esc(x.sjId)}"><b>${esc(x.noSj)} · ${esc(x.outletName)}</b><small>${(x.lines||[]).length} bahan · ${esc(x.note||'Tanpa catatan')}</small><span class="badge brand">CETAK</span></button>`).join('')||'<div class="empty">Belum ada Surat Jalan berstatus DRAFT.</div>'}</div>`);
    $$('[data-print-sjid]').forEach(b=>b.onclick=()=>directPrintDeliveryDraft(b.dataset.printSjid));
  }


  function directNewSj(){const d=state.data||{},outs=(d.outlets||[]).filter(x=>x.active==='YA'),mats=(d.materials||[]).filter(x=>x.active==='YA'&&x.distributable!==false);sheetHtml('Buat Surat Jalan Manual',`<form id="ghSj"><label class="field"><span>Outlet</span><select name="outletCode" required><option value="">Pilih</option>${outs.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('')}</select></label><div id="ghSjLines"></div><button type="button" class="btn btn-soft" id="ghAddSj">+ Tambah bahan</button><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Buat DRAFT</button></div></form>`);const box=$('#ghSjLines'),opts=mats.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.receiveUnit||'')}</option>`).join(''),add=()=>{const el=document.createElement('div');el.className='direct-line';el.innerHTML=`<select class="code"><option value="">Pilih bahan</option>${opts}</select><input class="qty" type="number" min="0.000001" step="0.000001" placeholder="Qty unit"><span></span><button class="line-remove" type="button">×</button>`;el.querySelector('.line-remove').onclick=()=>el.remove();box.appendChild(el)};add();$('#ghAddSj').onclick=add;$('#ghCancel').onclick=closeSheet;$('#ghSj').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),items=[...box.querySelectorAll('.direct-line')].map(x=>({code:x.querySelector('.code').value,qtyUnit:x.querySelector('.qty').value}));await writeDirect('manualSj','createDeliveryDraft',{outletCode:fd.get('outletCode'),note:fd.get('note'),items})};}
  function directReverse(txnId){const reason=prompt('Alasan pembatalan / reversal transaksi '+txnId+':');if(!reason)return;writeDirect('reverse_'+txnId,'reverseTransaction',{txnId:txnId,reason:reason}).catch(()=>{});}
  // Four clear operational actions for DRAFT; never expose a second Send while status is uncertain.
  function wwSjActionMarkupV15211(d,req,permissions,pendingDispatch,stillWorking=false){
    const status=String(d&&d.status||'').trim().toUpperCase();
    const actions=[];
    const button=(id,style,icon,label)=>
      '<button type="button" class="btn ww-sj-action ww-sj-action--'+style+'" id="'+id+'">'+icon+'<span>'+label+'</span></button>';
    if(status==='DRAFT'){
      if(pendingDispatch){
        // During an uncertain commit, do not allow Cancel, qty edits or new
        // Send. Only offer a read-only status check after automatic checking.
        if(stillWorking)
          actions.push('<button type="button" class="btn ww-sj-action ww-sj-action--status is-loading" disabled aria-busy="true" id="wwSjWaitingV15215">'+
            icons.clock+'<span>Sedang diproses · Jangan klik ulang</span></button>');
        else actions.push(button('ghCheckSjStatus','status',icons.clock,'Cek Status Kirim'));
      }else{
        if(permissions.canPrint)actions.push(button('ghPrintSj','thermal',icons.printer,'Cetak Thermal'));
        if(permissions.canPrepare&&req&&req.requestId)
          actions.push(button('wwSjCheckMaterialsV15210','check',icons.clipboard,'Periksa Bahan'));
        if(permissions.canCancel)
          actions.push(button('ghCancelSj','cancel',icons.warning,'Batalkan'));
        if(permissions.canDispatch)
          actions.push(button('ghSendSj','send',icons.truck,'Konfirmasi Kirim'));
      }
    }else if(status==='DIKIRIM'&&permissions.canPrint){
      actions.push(button('ghPrintSj','ready',icons.printer,'Cetak Thermal · SIAP KIRIM'));
    }else if(status!=='DIBATALKAN'&&permissions.canPrint){
      actions.push(button('ghPrintSj','thermal',icons.printer,'Cetak Thermal'));
    }
    return actions.length?'<div class="ww-sj-action-panel'+(actions.length===1?' is-single':'')+
      '" role="group" aria-label="Aksi Surat Jalan">'+actions.join('')+'</div>':'';
  }
  // Network operations always show an in-button spinner in addition to the existing busy indicator.
  async function wwSjWithLoadingV15211(button,operation){
    if(!button||button.disabled)return null;
    button.disabled=true;button.classList.add('is-loading');button.setAttribute('aria-busy','true');
    if(button.id==='ghSendSj'){
      const panel=button.closest('[data-ww-sj-live-actions]');
      if(panel)panel.querySelectorAll('button').forEach(sibling=>{
        if(sibling!==button)sibling.disabled=true;
      });
    }
    try{return await operation();}
    finally{
      if(button.isConnected){
        button.disabled=false;button.classList.remove('is-loading');button.removeAttribute('aria-busy');
        // In case the request was blocked before reaching backend (e.g. localStorage
        // quota), unlock sibling controls. During real dispatch the panel is replaced
        // by the pending-only action and this old button is disconnected.
        if(button.id==='ghSendSj'){
          const panel=button.closest('[data-ww-sj-live-actions]');
          if(panel)panel.querySelectorAll('button').forEach(sibling=>{
            if(sibling!==button)sibling.disabled=false;
          });
        }
      }
    }
  }
  // Shared bindings for initial render and in-place actions replacement.
  // A replaced action panel must bind its own handlers, not rebuild the sheet.
  function wwSjBindActionsV15213(id,d,req){
    const p=$('#ghPrintSj');if(p)p.onclick=()=>directPrintDeliveryDraft(id);
    const inspect=$('#wwSjCheckMaterialsV15210');if(inspect)inspect.onclick=()=>opsRequestDetailV43(req.requestId);
    const a=$('#ghAdjustSj');if(a)a.onclick=()=>directFulfillment(id);
    const c=$('#ghCancelSj');if(c)c.onclick=()=>{
      if(!confirm('Batalkan Surat Jalan '+d.noSj+'? Tindakan ini tidak mengirim barang.'))return;
      return wwSjWithLoadingV15211(c,()=>writeDeliveryDirect('cancel_'+id,'ownerCancelDeliveryDraftV1527',{sjId:id,reason:'Dibatalkan dari GitHub PWA'},id));
    };
    const check=$('#ghCheckSjStatus');if(check)check.onclick=()=>wwSjWithLoadingV15211(check,()=>dispatchCheckStatusV44(id));
    const recovery=$('#ghRecoveryLocalSJ');if(recovery)recovery.onclick=()=>wwSjWithLoadingV15211(recovery,()=>recoverSjLocalV1527(id));
    const k=$('#ghSendSj');if(k)k.onclick=()=>{
      if(!confirm('Hanya qty yang sudah disiapkan/disetujui yang akan mengurangi stok. Barang benar-benar siap dikirim?'))return;
      return wwSjWithLoadingV15211(k,()=>writeDeliveryDirect('dispatch_'+id,'dispatchDelivery',{sjId:id},id));
    };

  }
  function directDeliveryDetail(id){
    const d=((state.data||{}).deliveries||[]).find(x=>x.sjId===id);if(!d)return toast('SJ tidak ditemukan.');
    const canPrepare=roleCan('DELIVERY_PREPARE'),canCorrect=roleCan('OWNER_ONLY'),canCancel=roleCan('OWNER_ONLY'),canDispatch=roleCan('DELIVERY_DISPATCH'),canSync=roleCan('DELIVERY_SYNC');
    const pendingDispatch=dispatchPendingV44(id),req=findRequestForDelivery(d),sjDate=displayDateTimeShort(d.dispatchedAt||d.shipDate||d.createdAt),receiptFirst=String(d.outletReceiptFirstDate||''),receiptLast=String(d.outletReceiptLastDate||''),receiptCount=Number(d.outletReceiptCount||0);
    const requestMeta=req?`<div class="delivery-request-meta"><b>Permintaan Outlet · ${esc(displayDateShort(req.requestDate||req.createdAt))}</b><span>${req.needDate?'Dibutuhkan '+esc(displayDateShort(req.needDate)):''}${req.itemCount?' · '+num(req.itemCount,0)+' bahan':''}</span></div>`:'';
    const dateMeta=`<div class="delivery-date-meta"><b>Tanggal Surat Jalan</b><span>${esc(sjDate)}</span></div>`;
    const receiptLabel=!receiptLast?(receiptCount>0?'Sudah diterima · tanggal belum tercatat':'Belum diterima'):receiptFirst&&receiptFirst!==receiptLast?`${displayDateShort(receiptFirst)} – ${displayDateShort(receiptLast)}`:displayDateShort(receiptLast);
    const receiptMeta=`<div class="delivery-date-meta"><b>Tanggal Diterima Outlet</b><span>${esc(receiptLabel)}</span></div>`;
    const sjActions=wwSjActionMarkupV15211(d,req,{
      canPrint:actionAllowed('draftPrint'),canPrepare,canCancel,canDispatch
    },pendingDispatch,opsWriteInFlightV43.has('dispatch_'+id)||
      wwDispatchWatchersV15214.has(String(id)));
    // Keep audited local recovery available to Owner, but outside the four main actions.
    const recoveryOnly=sjRecoveryEligibleV1527(id,d)?
      '<details class="ww-sj-recovery-tools"><summary>Pemulihan Owner</summary><button class="btn btn-line" type="button" id="ghRecoveryLocalSJ">Audit Recovery Owner</button></details>':'';
    sheetHtml(d.noSj,`<p><b>${esc(d.outletName)}</b> · <span data-ww-sj-live-status>${deliveryStatusBadge(d.status)}</span>${d.createdBy?' · dibuat '+esc(d.createdBy):''}</p>${dateMeta}${requestMeta}${receiptMeta}<div class="ww-sj-inline-status-v15213" data-ww-sj-live-note role="status">${wwSjDispatchNoteV15213(id,d)}</div><div class="direct-list" data-ww-sj-live-lines>${wwSjRenderLinesV15213(d)}</div><div data-ww-sj-live-actions data-ww-sj-key="${esc(String(d.status||'')+'|'+!!pendingDispatch+'|'+!!(req&&req.requestId)+'|'+!!(opsWriteInFlightV43.has('dispatch_'+id)||wwDispatchWatchersV15214.has(String(id))))}">${sjActions}</div>${recoveryOnly}`,{key:'delivery-detail:'+id});
    wwSjBindActionsV15213(id,d,req);
    wwSjProgressEnsureV15215(id);
    if(String(d.status||'').toUpperCase()==='DRAFT'||pendingDispatch)dispatchMaybeRefreshFreshV45(id);
  }


  function findRequestForDelivery(d){
    if(!d||!d.sjId)return null;
    const candidates=[...((wwQueueV1526&&wwQueueV1526.rows)||[]),...((state.data||{}).incomingRequests||[])];
    return candidates.find(x=>{
      const sjId=String(x&&(x.sjId||x.linkedSjId)||'').trim();
      const noSj=String(x&&(x.noSj||x.linkedNoSj)||'').trim();
      return (sjId&&sjId===String(d.sjId))||(noSj&&noSj===String(d.noSj||''));
    })||null;
  }
  function wrapThermal(text,width){
    const words=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean),out=[];let line='';
    words.forEach(w=>{if(!line)line=w;else if((line+' '+w).length<=width)line+=' '+w;else{out.push(line);line=w;}});if(line)out.push(line);return out.length?out:[''];
  }
  function centerThermal(text,width){const t=String(text||'').slice(0,width),left=Math.max(0,Math.floor((width-t.length)/2));return ' '.repeat(left)+t;}
  function deliveryDisplayNote(d,req){return req?String(req.note||'').trim():String((d&&d.note)||'').trim();}
  function deliveryThermalText(d,width){
    width=Number(width)===48?48:32;const hr='-'.repeat(width),out=[],req=findRequestForDelivery(d),user=(state.data||{}).user||{};
    const sjStatus=String(d.status||'').trim().toUpperCase();
    const printStage=sjStatus==='DRAFT'?'DRAFT - CEK GUDANG':sjStatus==='DIKIRIM'?'SIAP KIRIM':'CHECKLIST SURAT JALAN';
    out.push(centerThermal('WILLS COFFEE',width));out.push(centerThermal(printStage,width));out.push(hr);
    wrapThermal('Status SJ: '+sjStatus,width).forEach(x=>out.push(x));
    wrapThermal('No SJ: '+d.noSj,width).forEach(x=>out.push(x));wrapThermal('Outlet: '+d.outletName,width).forEach(x=>out.push(x));
    if(req)wrapThermal('Permintaan: '+displayDateShort(req.requestDate||req.createdAt),width).forEach(x=>out.push(x));if(req&&req.needDate)wrapThermal('Dibutuhkan: '+displayDateShort(req.needDate),width).forEach(x=>out.push(x));
    {const rf=String(d.outletReceiptFirstDate||''),rl=String(d.outletReceiptLastDate||''),rc=Number(d.outletReceiptCount||0),label=!rl?(rc>0?'Sudah diterima - tanggal belum tercatat':'Belum diterima'):rf&&rf!==rl?displayDateShort(rf)+' - '+displayDateShort(rl):displayDateShort(rl);wrapThermal('Diterima Outlet: '+label,width).forEach(x=>out.push(x));}
    wrapThermal('Dicetak: '+new Intl.DateTimeFormat('id-ID',{dateStyle:'short',timeStyle:'short'}).format(new Date()),width).forEach(x=>out.push(x));wrapThermal('Petugas: '+(user.name||'-')+' / '+roleName(user.role),width).forEach(x=>out.push(x));out.push(hr);
    (d.lines||[]).forEach((l,i)=>{const requested=Number(l.requestedQtyUnit!=null?l.requestedQtyUnit:(l.qtyUnit||0)),approved=Number(l.qtyUnit||0),status=String(l.fulfillmentStatus||'DIPENUHI');wrapThermal('[ ] '+(i+1)+'. '+l.name,width).forEach(x=>out.push(x));wrapThermal('    Diminta: '+num(requested)+' '+(l.sendUnit||''),width).forEach(x=>out.push(x));wrapThermal('    Disiapkan: '+num(approved)+' '+(l.sendUnit||''),width).forEach(x=>out.push(x));if(status!=='DIPENUHI')wrapThermal('    Status: '+status,width).forEach(x=>out.push(x));if(l.fulfillmentReason)wrapThermal('    Alasan: '+l.fulfillmentReason,width).forEach(x=>out.push(x));out.push('');});
    out.push(hr);out.push('CHECK GUDANG');out.push('[ ] Jumlah sesuai draft');out.push('[ ] Kondisi bahan baik');out.push('[ ] Sudah dimuat/dibawa');out.push('');out.push('CHECK BARISTA OUTLET');out.push('[ ] Nama bahan sesuai');out.push('[ ] Jumlah diterima sesuai');out.push('[ ] Kondisi bahan baik');out.push('');wrapThermal('Nama Barista: __________________',width).forEach(x=>out.push(x));wrapThermal('Paraf: _________________________',width).forEach(x=>out.push(x));out.push(hr);wrapThermal('Setelah dicek, foto checklist ini dan kirim ke grup.',width).forEach(x=>out.push(x));{const note=deliveryDisplayNote(d,req);if(note){out.push(hr);wrapThermal('Catatan: '+note,width).forEach(x=>out.push(x));}}out.push('');out.push('');return out.join('\n');
  }
  function directPrintDeliveryDraft(id){
    const d=((state.data||{}).deliveries||[]).find(x=>x.sjId===id);if(!d)return toast('SJ tidak ditemukan.');
    let saved=Number(localStorage.getItem('ww_thermal_width')||32);if(saved!==48)saved=32;const initial=deliveryThermalText(d,saved);
    sheetHtml('Cetak Thermal Bluetooth',`<p>Format checklist dibuat untuk printer thermal. Pilih lebar printer lalu tekan <b>Cetak Bluetooth (RawBT)</b>.</p><label class="field thermal-width"><span>Lebar Printer</span><select id="thermalWidth"><option value="32" ${saved===32?'selected':''}>58 mm · 32 karakter</option><option value="48" ${saved===48?'selected':''}>80 mm · 48 karakter</option></select></label><pre class="thermal-preview" id="thermalPreview">${esc(initial)}</pre><div class="actions"><button class="btn btn-line" id="thermalBack" type="button">Kembali</button><button class="btn btn-soft" id="thermalBrowser" type="button">Print Sistem</button><button class="btn btn-thermal" id="thermalRawbt" type="button">Cetak Bluetooth (RawBT)</button></div><div class="thermal-note">Checklist fisik diberikan ke barista untuk dicentang. Setelah pengecekan, kertas dapat difoto dan dikirim ke grup sebagai bukti.</div>`,{key:'delivery-thermal:'+id});
    const sel=$('#thermalWidth'),preview=$('#thermalPreview');const update=()=>{const w=Number(sel.value)===48?48:32;localStorage.setItem('ww_thermal_width',String(w));preview.textContent=deliveryThermalText(d,w);return preview.textContent};
    sel.onchange=update;$('#thermalBack').onclick=closeSheet;$('#thermalRawbt').onclick=()=>printRawBt(update());$('#thermalBrowser').onclick=()=>printThermalBrowser(update(),Number(sel.value));
  }
  function printRawBt(text){
    try{const a=document.createElement('a');a.href='rawbt:'+encodeURIComponent(String(text||''));a.style.display='none';document.body.appendChild(a);a.click();a.remove();toast('Membuka RawBT. Pilih printer Bluetooth yang sudah tersambung.');}catch(e){toast('RawBT tidak dapat dibuka: '+e.message);}
  }
  function printThermalBrowser(text,width){
    const w=window.open('','_blank','width=420,height=720');if(!w)return toast('Popup print diblokir browser.');const mm=Number(width)===48?'80mm':'58mm';w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Surat Jalan Wills Coffee</title><style>@page{size:'+mm+' auto;margin:3mm}body{margin:0;font:12px/1.35 monospace;color:#000}pre{white-space:pre-wrap;margin:0}</style></head><body><pre>'+esc(text)+'</pre></body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),120);
  }


  function directFulfillment(id){if(currentRole()!=='OWNER')return toast('Perubahan data pemenuhan hanya dapat dilakukan Owner. Admin wajib melaporkan selisih.','warning');const d=((state.data||{}).deliveries||[]).find(x=>x.sjId===id);if(!d||d.status!=='DRAFT')return toast('SJ bukan DRAFT.');sheetHtml('Atur Ketersediaan',`<p>Permintaan asli outlet tidak diubah. Isi 0 jika tidak tersedia; alasan wajib jika qty dikurangi.</p><form id="ghFulfillment"><div class="direct-list">${(d.lines||[]).map(l=>{const req=Number(l.requestedQtyUnit!=null?l.requestedQtyUnit:(l.qtyUnit||0));return `<div class="direct-card" data-ful-line="${l.lineNo}"><b>${esc(l.name)}</b><small>Diminta ${num(req)} ${esc(l.sendUnit)}</small><label class="field"><span>Qty disetujui</span><input class="approved" type="number" min="0" max="${req}" step="0.000001" value="${Number(l.qtyUnit||0)}" required></label><label class="field"><span>Alasan jika kurang / kosong</span><textarea class="reason">${esc(l.fulfillmentReason||'')}</textarea></label></div>`}).join('')}</div><div class="actions"><button class="btn btn-line" type="button" id="ghBackSj">Kembali</button><button class="btn btn-primary">Simpan</button></div></form>`,{key:'delivery-fulfillment:'+id});$('#ghBackSj').onclick=closeSheet;$('#ghFulfillment').onsubmit=async e=>{e.preventDefault();const items=$$('[data-ful-line]').map(x=>({lineNo:Number(x.dataset.fulLine),approvedQtyUnit:x.querySelector('.approved').value,reason:x.querySelector('.reason').value}));await writeDeliveryDirect('fulfillment_'+id,'ownerAdjustDeliveryDraftFulfillmentV1527',{sjId:id,items},id)};}
  function showDiagnostic(r){sheetHtml('Diagnostik Sinkron Penerimaan',`<p>Audit ini hanya membaca data outlet dan Surat Jalan.</p><div class="direct-list">${((r||{}).diagnostics||[]).map(x=>`<div class="direct-card"><b>${esc(x.noSj)} · ${esc(x.outletName||x.outletCode||'')}</b><small>${x.matched}/${x.receiptCount} receipt cocok · alias ${x.aliasMatched||0}</small><span class="badge ${x.ok?'ok':'bad'}">${x.ok?'COCOK':'PERLU CEK'}</span>${x.issues&&x.issues.length?`<div class="direct-issues">${x.issues.map(i=>esc((i.code||i.name)+' · '+i.reason+(i.expectedUnit?' · '+i.baseUnit+'→'+i.expectedUnit:''))).join('<br>')}</div>`:''}</div>`).join('')||'<div class="empty">Belum ada receipt yang cocok dengan SJ aktif.</div>'}</div>`)}
  // v1.2.9.1.1 — Fix HTML number step Pembayaran Outlet: Rupiah bulat/desimal 2 digit valid, max tetap sisa piutang per SJ.
  function directOutletPayment(){
    const rows=((state.data||{}).receivables||[]).filter(x=>x.outstanding>0);
    sheetHtml('Pembayaran Outlet',`<form id="ghAr"><div class="role-guide"><b>Payment Guard Aktif</b><span>Pembayaran wajib melalui Review → Konfirmasi → Posting. Satu transaksi hanya untuk satu outlet.</span></div><label class="field"><span>Masuk ke</span><select name="destination"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><label class="field"><span>Referensi</span><input name="reference" required placeholder="No transfer / setoran / bukti"></label><div class="direct-list">${rows.map(x=>`<label class="direct-card"><b>${esc(x.outletName)} · ${esc(x.noSj)}</b><small>Sisa ${rp(x.outstanding)}</small><input type="checkbox" class="arck" data-id="${esc(x.sjId)}" data-outlet="${esc(x.outletCode)}"><input class="aramt" data-id="${esc(x.sjId)}" type="number" value="${x.outstanding}" min="0.01" max="${x.outstanding}" step="0.01"></label>`).join('')||'<div class="empty">Tidak ada piutang.</div>'}</div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Review Pembayaran</button></div></form>`);
    $('#ghCancel').onclick=closeSheet;
    $('#ghAr').onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.target),cks=$$('.arck:checked');
      const outs=[...new Set(cks.map(x=>x.dataset.outlet))];
      if(!cks.length)return toast('Pilih minimal satu piutang.','warning');
      if(outs.length>1)return toast('Satu pembayaran hanya boleh untuk satu outlet.','warning');
      const reference=String(fd.get('reference')||'').trim();
      if(reference.length<3)return toast('Referensi pembayaran wajib diisi.','warning');
      const payload={
        destination:fd.get('destination'),
        reference,
        note:fd.get('note'),
        allocations:cks.map(x=>({
          sjId:x.dataset.id,
          amount:document.querySelector(`.aramt[data-id="${CSS.escape(x.dataset.id)}"]`).value
        }))
      };
      beginBusy('Menyiapkan review pembayaran…');
      try{
        const review=await bridge.call('prepareOutletPaymentV1390',state.token,payload);
        if(!review||!review.confirmToken)throw new Error('Token konfirmasi pembayaran tidak terbentuk. Ulangi review.');
        const detail=(review.allocations||[]).map(x=>x.noSj+' · '+rp(x.amount)).join('\n');
        const approved=window.confirm(
          'REVIEW PEMBAYARAN\n\n'+
          'Outlet: '+review.outletName+'\n'+
          detail+
          '\n\nTotal: '+rp(review.total)+
          '\nMasuk ke: '+review.destination+
          '\nReferensi: '+review.reference+
          '\n\nLanjutkan posting?'
        );
        if(!approved)return;
        const confirmedPayload={
          confirmToken:review.confirmToken,
          destination:review.destination,
          reference:review.reference,
          note:payload.note,
          allocations:(review.allocations||[]).map(x=>({sjId:x.sjId,amount:x.amount}))
        };
        await writeDirect('outletPaymentV1390','postOutletPayment',confirmedPayload);
      }catch(err){
        toast(err&&err.message?err.message:'Pembayaran gagal. Ulangi review.','error');
      }finally{
        endBusy();
      }
    };
  }
  function directExpense(){const cats=(state.data||{}).expenseCategories||[];sheetHtml('Pengeluaran Operasional',`<form id="ghExp"><label class="field"><span>Kategori</span><select name="category">${cats.map(x=>`<option value="${esc(x.code)}">${esc(x.label)}</option>`).join('')}</select></label><div class="form-2"><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><label class="field"><span>Nominal</span><input name="amount" type="number" min="1" required></label></div><label class="field"><span>Referensi</span><input name="reference"></label><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghExp').onsubmit=async e=>{e.preventDefault();await writeDirect('expense','postOperationalExpense',Object.fromEntries(new FormData(e.target).entries()))};}
  function directSupplierPayment(){const rows=((state.data||{}).payables||[]).filter(x=>x.outstanding>0);sheetHtml('Bayar Supplier',`<form id="ghPaySup"><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><div class="direct-list">${rows.map(x=>`<label class="direct-card"><b>${esc(x.supplier)}</b><small>${esc(x.purchaseTxnId)} · ${rp(x.outstanding)}</small><input class="spck" type="checkbox" data-id="${esc(x.purchaseTxnId)}" data-sup="${esc(x.supplierId)}"><input class="spamt" data-id="${esc(x.purchaseTxnId)}" type="number" value="${x.outstanding}" min="0.01" max="${x.outstanding}"></label>`).join('')||'<div class="empty">Tidak ada hutang.</div>'}</div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghPaySup').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),cks=$$('.spck:checked'),sup=[...new Set(cks.map(x=>x.dataset.sup))];if(!cks.length)return toast('Pilih hutang.');if(sup.length>1)return toast('Pilih satu supplier.');await writeDirect('supplierPayment','postSupplierPayment',{paymentSource:fd.get('paymentSource'),note:fd.get('note'),allocations:cks.map(x=>({purchaseTxnId:x.dataset.id,amount:$(`.spamt[data-id="${CSS.escape(x.dataset.id)}"]`).value}))})};}
  // SO Owner 08 Nov 2026 — fixed physically-counted target, not a historical
  // adjustment delta. Always convert to base units from the live master, and
  // let the canonical OWNER backend perform the stock + HPP journal posting.
  const WW_SO0811_TARGET_V15216=Object.freeze([
    ['B01',299],['B02',45],['B03',33],['B04',5],['B05',6],['B06',1],
    ['B21',12],['B-EVP',0],['B-LMN',2],['B-ORG',1],['B-SAR',0],
    ['B07',142],['B08',137],['B09',2],['B10',273],['B11',327],
    ['WH-RAW-CREAMER',38],['WH-RAW-MATCHA',7],['WH-RAW-COKLAT',7],
    ['WH-RAW-MANGGA',640],['WH-RAW-CHOCO-DILO',750],
    ['B12',6165],['B13',450],['B14',5],['B15',0],['B16',9],
    ['B17',7],['B23',0],['B24',11],['B25',0],['B26',0],
    ['WH-CUP-KERTAS-6OZ',79],['WH-PLASTIK-KLIP-5X8',0],
    ['WH-PLASTIK-KLIP-6X10',0],['WH-PLASTIK-TOMAT',0],
    ['B18',8],['B19',2],['B20',10],['B22',6],
    ['WH-BATERAI-AAA',7],['WH-TALI-TIES',0],['WH-STIK-MIXER-HAND',0]
  ]);
  const WW_SO0811_POST_KEY_V15216='SO08112026_FISIK_OWNER_42_CANONICAL_ONCE_V15216';
  const WW_SO0811_PENDING_V15216='ww_owner_so0811_post_started_v15216';
  function wwSo0811PreparedV15216(bootstrap){
    if(!bootstrap||!Array.isArray(bootstrap.stock)||!Array.isArray(bootstrap.materials))
      throw Error('Data master/stok belum lengkap; penyesuaian ditahan.');
    const stock=new Map(bootstrap.stock.map(x=>[x.code,x])),
      master=new Map(bootstrap.materials.map(x=>[x.code,x])),seen=new Set();
    if(WW_SO0811_TARGET_V15216.length!==42)throw Error('Daftar SO tidak lengkap (42 bahan).');
    return WW_SO0811_TARGET_V15216.map(([code,physical])=>{
      if(seen.has(code))throw Error('Kode SO duplikat: '+code);
      seen.add(code);
      const m=master.get(code),st=stock.get(code);
      if(!m||!st||!(Number(m.factor)>0)||m.active!=='YA')
        throw Error('Master/stok tidak valid: '+code);
      const current=Number(st.qty),factor=Number(m.factor),target=physical*factor,
        avg=Number(st.avgCost||0),delta=target-current;
      if(!Number.isFinite(current)||current<0||!Number.isFinite(target)||target<0||
        !Number.isFinite(avg)||avg<0)
        throw Error('Nilai stok invalid: '+code);
      return {code,name:m.name,unit:m.receiveUnit||m.baseUnit,factor,physical,
        current,target,delta,avg,needsCost:delta>1e-8&&avg<=0};
    });
  }
  async function directSO0811V15216(){
    if(currentRole()!=='OWNER')return toast('SO 8 November hanya dapat diposting Owner.','warning');
    let original,rows;
    try{
      original=await withBusy('Membaca saldo gudang terbaru…',()=>bridge.call('getAppBootstrap',state.token));
      rows=wwSo0811PreparedV15216(original);
    }catch(e){return toast('SO 8 November ditahan: '+String(e&&e.message||e),'warning',12000)}
    const changed=rows.filter(x=>Math.abs(x.delta)>1e-8),
      cards=rows.map(x=>'<div class="direct-card" data-ww-so0811="'+esc(x.code)+'">'+
        '<b>'+esc(x.name)+'</b><small>'+esc(x.code)+' · '+esc(x.unit)+'</small>'+
        '<small>Sistem: '+num(x.current/x.factor)+' → Fisik: <b>'+num(x.physical)+
        '</b> '+esc(x.unit)+' · Selisih '+num(x.delta/x.factor)+'</small>'+
        (x.needsCost?'<label class="field"><span>Modal per '+esc(x.unit)+
          ' (wajib karena modal sistem kosong)</span><input class="ww-so0811-cost" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Harga modal per unit"></label>':'')+
        '</div>').join('');
    const maybePosted=(()=>{try{return localStorage.getItem(WW_SO0811_PENDING_V15216)}catch(e){return 'STORAGE_ERROR'}})();
    const warning=maybePosted?
      '<p><b>Pengiriman posting SO ini pernah dimulai di perangkat ini.</b> Jangan mengulang; audit transaksi ADJ dan stok dulu.</p>':'';
    sheetHtml('SO Fisik 8 November · Owner',
      '<div class="ww-preprint-summary"><b>Stock Opname 8 November 2026 · 42 bahan</b>'+
      '<p>Angka berdasarkan hitung langsung Owner. Target akan diposting melalui STOCK_ADJUSTMENT canonical, bukan mengubah SO 31 Oktober yang terkunci.</p>'+
      '<p><b>'+changed.length+' bahan selisih</b> · '+(42-changed.length)+
      ' bahan sudah cocok. Pastikan staf berhenti sementara dari transaksi gudang sebelum POSTING.</p>'+
      warning+'</div><div class="direct-list">'+cards+'</div>'+
      '<div class="actions"><button class="btn btn-line" type="button" id="wwSo0811Back">Kembali</button>'+
      (maybePosted?'<button class="btn btn-soft" type="button" disabled>Posting sebelumnya perlu audit</button>':
        changed.length?'<button class="btn btn-primary" type="button" id="wwSo0811Post">Terapkan 42 Stok Fisik · Owner</button>':
        '<button class="btn btn-soft" type="button" disabled>42 bahan sudah cocok</button>')+
      '</div>',{key:'ww-so0811-owner'});
    $('#wwSo0811Back').onclick=directAdjustment;
    const button=$('#wwSo0811Post');if(!button)return;
    button.onclick=async()=>{
      if(currentRole()!=='OWNER'||button.disabled)return;
      button.disabled=true;button.classList.add('is-loading');button.setAttribute('aria-busy','true');
      let sent=false;
      try{
        const costs=new Map();
        for(const x of rows.filter(x=>x.needsCost)){
          const input=$('[data-ww-so0811="'+x.code+'"] .ww-so0811-cost');
          const value=Number(input&&input.value);
          if(!(value>0))throw Error('Isi modal '+x.name+' terlebih dahulu.');
          costs.set(x.code,value/x.factor);
        }
        const latest=await withBusy('Memverifikasi ulang saldo dan 42 bahan…',
          ()=>bridge.call('getAppBootstrap',state.token));
        const fresh=wwSo0811PreparedV15216(latest);
        for(let i=0;i<rows.length;i++){
          if(rows[i].code!==fresh[i].code||rows[i].factor!==fresh[i].factor||
            Math.abs(rows[i].current-fresh[i].current)>1e-8)
            throw Error('Stok sistem berubah sejak pratinjau. Buka SO 8 November lagi untuk pemeriksaan ulang.');
        }
        if(!fresh.some(x=>Math.abs(x.delta)>1e-8)){
          toast('Seluruh 42 bahan sudah cocok dengan stok fisik. Tidak perlu transaksi baru.','success');
          return directSO0811V15216();
        }
        if(!confirm('POSTING STOCK OPNAME 8 NOVEMBER 2026?\n\n'+
          '42 target stok fisik Owner akan dipakai. '+changed.length+' bahan selisih dicatat via Ledger Stok canonical.\n'+
          'Ini memengaruhi saldo dan nilai persediaan, TANPA mengubah SO 31 Oktober atau kas.\n'+
          'Pastikan tidak sedang ada transaksi gudang. Lanjutkan SATU KALI?'))return;
        // Fail closed: do not submit a write without a durable local one-attempt guard.
        try{localStorage.setItem(WW_SO0811_PENDING_V15216,JSON.stringify({at:Date.now(),status:'SUBMITTED'}));
          if(!localStorage.getItem(WW_SO0811_PENDING_V15216))throw Error('not persisted');
        }catch(e){throw Error('Pengunci lokal gagal disimpan. POSTING dibatalkan sebelum backend dipanggil.')}
        sent=true;
        const items=fresh.map(x=>({
          code:x.code,physicalQtyBase:x.target,
          unitCostBase:x.needsCost?costs.get(x.code):''
        }));
        const result=await withBusy('Posting koreksi fisik 42 bahan ke Ledger Stok…',
          ()=>bridge.call('ownerPostStockAdjustmentV1527',state.token,{
            reason:'SELISIH_OPNAME',
            note:'SO FISIK 08-11-2026 OWNER | 42 bahan | baseline operasional | one-time canonical adjustment',
            items
          },WW_SO0811_POST_KEY_V15216));
        if(!result||result.ok===false)throw Error(result&&result.error||'Respons posting tidak valid');
        // No second write or retry. Independently verify all 42 live balances.
        const verification=await withBusy('Memastikan 42 saldo gudang terbaru…',
          ()=>bridge.call('getAppBootstrap',state.token));
        const checked=wwSo0811PreparedV15216(verification),
          mismatches=checked.filter(x=>Math.abs(x.delta)>1e-8);
        if(mismatches.length)throw Error('Posting telah dijalankan, tetapi '+mismatches.length+
          ' saldo masih berbeda saat verifikasi. Periksa transaksi ADJ; JANGAN posting ulang.');
        try{localStorage.setItem(WW_SO0811_PENDING_V15216,JSON.stringify({at:Date.now(),
          status:'CONFIRMED',txnId:result.txnId||''}));}catch(e){}
        toast('Stock Opname 8 November sudah POSTED dan 42 saldo terverifikasi.','success',13000);
        return directSO0811V15216();
      }catch(e){
        toast((sent?'Status POSTING belum pasti; jangan coba lagi sebelum audit Ledger Stok. ':'')+
          String(e&&e.message||e),'warning',14000);
      }finally{
        if(button.isConnected){button.disabled=false;button.classList.remove('is-loading');button.removeAttribute('aria-busy')}
      }
    };
  }

  // SO fisik 31 Oktober 2026 (before the first 1 Nov dispatch).
  // Only the 16 discrepancies are posted through the existing canonical stock adjustment.
  // Source: protected tab "SO 31-10-2026 TERKUNCI"; never overwrite Stok Gudang cells.
  const WW_SO3110_DELTA_V1527=Object.freeze([
    ['B01',-5000],['B03',-1000],['B04',-1950],['B05',-6000],
    ['B06',-2000],['B09',-112],['B07',-2370],['B08',1200],
    ['B12',-1001],['B15',-100],['B20',-7],['B22',-20],
    ['B-LMN',-300],['WH-STIK-MIXER-HAND',2],['B-SAR',-990],
    ['WH-BATERAI-AAA',-2]
  ]);
  const WW_SO3110_POST_KEY_V1527='SO3110_2026_STOCK_BASELINE_OWNER_LOCKED_ONCE_V1527';
  async function directSO3110V1527(){
    if(currentRole()!=='OWNER')return toast('Hanya Owner yang boleh koreksi saldo stok.','warning');
    let fresh;
    try{
      fresh=await withBusy('Membaca stok live sebelum rekonsiliasi…',async()=>{
        const result=await bridge.call('getAppBootstrap',state.token);
        if(!result||!Array.isArray(result.stock)||!Array.isArray(result.materials))
          throw Error('Data stok dan konversi master belum lengkap; posting ditahan.');
        return result;
      });
    }catch(e){return toast(e.message,'warning')}
    const materials=new Map(fresh.materials.map(m=>[m.code,m])),
      stock=new Map(fresh.stock.map(st=>[st.code,st]));
    let bad=[],prepared=[];
    for(const [code,delta] of WW_SO3110_DELTA_V1527){
      const m=materials.get(code),st=stock.get(code);
      if(!m||!st||!(Number(m.factor)>0)) {bad.push(code+': master / stok belum sinkron');continue;}
      const current=Number(st.qty),target=current+delta,
        cost=Number(st.avgCost||0);
      if(!Number.isFinite(current)||!Number.isFinite(target)||target<0)
        {bad.push(code+': target koreksi tidak valid');continue;}
      prepared.push({code,name:m.name,unit:m.receiveUnit||m.baseUnit,factor:Number(m.factor),
        current,currentUnit:current/Number(m.factor),target,targetUnit:target/Number(m.factor),
        delta,deltaUnit:delta/Number(m.factor),cost});
    }
    if(bad.length)return toast('Koreksi ditahan: '+bad.join(' · '),'error');
    const cards=prepared.map(x=>'<div class="direct-card" data-so-code="'+esc(x.code)+'">'+
      '<b>'+esc(x.name)+'</b><small>'+esc(x.code)+' · '+esc(x.unit)+'</small>'+
      '<small>Stok sistem saat ini: '+num(x.currentUnit)+' → Target setelah koreksi: <b>'+num(x.targetUnit)+
      '</b> (selisih '+num(x.deltaUnit)+')</small>'+
      (x.delta>0?'<label class="field"><span>Modal pembelian per '+esc(x.unit)+' (wajib untuk stok bertambah)</span>'+
        '<input class="ww-so-cost" type="number" min="0.01" step="0.01" placeholder="Rp, sesuai bukti pembelian" value="'+
        (x.cost>0?String(Math.round(x.cost*x.factor*100)/100):'')+'"></label>':'')+
      '</div>').join('');
    sheetHtml('Rekonsiliasi SO · Owner',
      '<div class="ww-preprint-summary"><b>SO Fisik 31 Oktober 2026</b> · saldo awal 1 Nov sebelum pengiriman.'+
      '<p>Sistem 1 November telah bertransaksi. Koreksi yang diposting adalah <b>selisih SO</b> terhadap stok live, bukan menulis ulang angka fisik awal.</p>'+
      '<p><b>16 bahan selisih</b> · 11 bahan telah cocok · 27 bahan dicatat pada tab SO terkunci.</p>'+
      '<p>Pastikan seluruh mutasi pengiriman, purchase dan packing sudah masuk sebelum posting. '+
      'Dua tambahan stok memerlukan modal yang benar agar valuasi tidak keliru.</p></div>'+
      '<div class="direct-list">'+cards+'</div>'+
      '<div class="actions"><button class="btn btn-line" id="wwSoBack" type="button">Kembali</button>'+
      '<button class="btn btn-primary" id="wwSoPost" type="button">Review & Posting Koreksi (Owner)</button></div>',
      {key:'ww-so3110-owner'});
    $('#wwSoBack').onclick=closeSheet;
    $('#wwSoPost').onclick=async()=>{
      if(currentRole()!=='OWNER')return toast('Hanya Owner.');
      const costs=new Map();let invalid=[];
      for(const x of prepared.filter(x=>x.delta>0)){
        const el=$('[data-so-code="'+x.code+'"] .ww-so-cost');
        const cost=Number(el&&el.value);
        if(!Number.isFinite(cost)||cost<=0)invalid.push(x.name+' memerlukan modal/unit');
        else costs.set(x.code,cost/x.factor);
      }
      if(invalid.length)return toast(invalid.join(' · '),'warning');
      // Re-read immediately: never post based on an older preview.
      const button=$('#wwSoPost');button.disabled=true;button.setAttribute('aria-busy','true');
      try {
        const output=await withBusy('Memverifikasi stok terbaru & posting koreksi SO…',async()=>{
          const recent=await bridge.call('getAppBootstrap',state.token);
          const recentStock=new Map((recent.stock||[]).map(x=>[x.code,x])),
            recentMaterials=new Map((recent.materials||[]).map(x=>[x.code,x]));
          const items=[];
          for(const [code,delta] of WW_SO3110_DELTA_V1527) {
            const st=recentStock.get(code),m=recentMaterials.get(code);
            if(!st||!m||!(Number(m.factor)>0))throw Error('Material/stock berubah: '+code);
            const base=Number(st.qty||0)+delta;
            if(!Number.isFinite(base)||base<0)throw Error('Target fisik negatif: '+code);
            const unitCostBase=delta>0?costs.get(code):'';
            if(delta>0&&!(unitCostBase>0))throw Error('Modal bahan belum valid: '+code);
            items.push({code,physicalQtyBase:base,unitCostBase});
          }
          const approved=confirm('KOREKSI STOK SO 31 OKTOBER\n\n'+
            '16 bahan akan disesuaikan dengan selisih SO terhadap sistem.\n'+
            'Pengiriman/purchase/packing 1 November dipertahankan.\n'+
            'Posting hanya sekali, tidak dapat diulangi tanpa audit Owner.\n\n'+
            'Konfirmasi POSTING koreksi stok?');
          if(!approved)return null;
          return await bridge.call('ownerPostStockAdjustmentV1527',state.token,{
            reason:'SELISIH_OPNAME',
            note:'SO31-10-2026 LOCKED | snapshot fisik sebelum kirim 01-11 | 16 koreksi | idempotent owner posting',
            items},WW_SO3110_POST_KEY_V1527);
        });
        if(!output)return;
        if(output.ok===false)throw Error(output.error||'Posting koreksi ditolak backend');
        toast('Koreksi SO telah dikirim ke backend canonical. Verifikasi Ledger Stok dan transaksi adjustment sebelum menyatakan selesai.','success');
      }catch(err){
        toast('Status posting belum pasti: '+(err.message||err)+'. Periksa Ledger Stok dahulu, jangan mengulang secara manual.','warning',14000);
      }finally{button.disabled=false;button.removeAttribute('aria-busy')}
    };
  }

  function directAdjustment(){if(currentRole()!=='OWNER')return toast('Penyesuaian stok hanya dapat dilakukan Owner.');sheetHtml('Opname / Koreksi',`<button type="button" class="btn btn-primary" id="wwSo0811Open">Terapkan SO Fisik 8 November · 42 Bahan</button><button type="button" class="btn btn-soft" id="wwSo3110Open">Rekonsiliasi SO Fisik 31 Oktober · Owner</button><div class="ww-life-note">Referensi SO telah diproteksi. Koreksi harus dicatat lewat Ledger Stok, tidak boleh menimpa tabel stok.</div><form id="ghAdj"><label class="field"><span>Alasan</span><select name="reason"><option value="SELISIH_OPNAME">Selisih opname</option><option value="STOK_AWAL_TERLEWAT">Stok awal terlewat</option><option value="BARANG_DITEMUKAN">Barang ditemukan</option><option value="BARANG_RUSAK">Barang rusak</option><option value="BARANG_HILANG">Barang hilang</option><option value="KESALAHAN_PENCATATAN">Kesalahan pencatatan</option><option value="KOREKSI_INVESTIGASI">Koreksi investigasi</option><option value="LAINNYA">Lainnya</option></select></label><div id="ghAdjLines"></div><button class="btn btn-soft" type="button" id="ghAddAdj">+ Tambah bahan</button><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting Koreksi</button></div></form>`);const box=$('#ghAdjLines'),add=()=>{const el=document.createElement('div');el.className='direct-line';el.innerHTML=`<select class="code"><option value="">Pilih bahan</option>${matOpts(false)}</select><input class="physical" type="number" min="0" step="0.000001" placeholder="Stok fisik unit"><input class="cost" type="number" min="0" step="0.01" placeholder="Modal/unit jika perlu"><button class="line-remove" type="button">×</button>`;el.querySelector('.line-remove').onclick=()=>el.remove();box.appendChild(el)};add();$('#ghAddAdj').onclick=add;$('#wwSo0811Open').onclick=directSO0811V15216;$('#wwSo3110Open').onclick=directSO3110V1527;$('#ghCancel').onclick=closeSheet;$('#ghAdj').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),mm=matByCode(),items=[...box.querySelectorAll('.direct-line')].map(x=>{const m=mm[x.querySelector('.code').value],physical=Number(x.querySelector('.physical').value||0),cost=x.querySelector('.cost').value;return{code:m.code,physicalQtyBase:physical*Number(m.factor||1),unitCostBase:cost===''?'':Number(cost)/Number(m.factor||1)}});await writeDirect('adjustment','ownerPostStockAdjustmentV1527',{reason:fd.get('reason'),note:fd.get('note'),items})};}
  function directPackingWage(){const rows=((state.data||{}).packingWages||[]).filter(x=>x.outstanding>0);sheetHtml('Bayar Upah Packing',`<form id="ghPw"><label class="field"><span>Sumber</span><select name="paymentSource"><option value="CASH">Kas Gudang</option><option value="BANK">Bank</option></select></label><div class="direct-list">${rows.map(x=>`<label class="direct-card"><b>${esc(x.packer)}</b><small>${esc(x.batchId)} · ${rp(x.outstanding)}</small><input class="pwck" type="checkbox" data-id="${esc(x.batchId)}" data-packer="${esc(x.packer)}"><input class="pwamt" data-id="${esc(x.batchId)}" type="number" value="${x.outstanding}" min="0.01" max="${x.outstanding}"></label>`).join('')||'<div class="empty">Tidak ada upah terhutang.</div>'}</div><label class="field"><span>Catatan</span><textarea name="note"></textarea></label><div class="actions"><button class="btn btn-line" type="button" id="ghCancel">Tutup</button><button class="btn btn-primary">Posting</button></div></form>`);$('#ghCancel').onclick=closeSheet;$('#ghPw').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),cks=$$('.pwck:checked'),pack=[...new Set(cks.map(x=>x.dataset.packer))];if(!cks.length)return toast('Pilih upah.');if(pack.length>1)return toast('Pilih satu packer.');await writeDirect('packingWage','postPackingWagePayment',{paymentSource:fd.get('paymentSource'),note:fd.get('note'),allocations:cks.map(x=>({batchId:x.dataset.id,amount:$(`.pwamt[data-id="${CSS.escape(x.dataset.id)}"]`).value}))})};}


  async function directCentralPrice(){
    if(!roleCan('CENTRAL_PRICE'))return toast('Pusat Harga hanya untuk Owner / Admin 1 Finance.');
    let d;await withBusy('Membaca Pusat Harga…',async()=>{d=await callDirect('centralPriceDashboard')});
    const mats=d.materials||[],outs=d.outlets||[],today=d.asOf||new Date().toISOString().slice(0,10);
    sheetHtml('Pusat Harga Bahan',`<div class="role-guide"><b>Satu sumber harga, tetap fleksibel</b><span><strong>Default Pusat</strong> berlaku ke seluruh outlet. Gunakan <strong>Override Outlet</strong> hanya jika harga outlet memang sengaja berbeda.</span><span>HPP modal tetap mengikuti moving average dari Belanja Bahan dan tidak berubah hanya karena Harga Internal diubah. SJ lama tetap memakai snapshot harga lama.</span></div><form id="ghCentralPrice"><label class="field"><span>Bahan</span><select name="code" required><option value="">Pilih bahan</option>${mats.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.receiveUnit)}</option>`).join('')}</select></label><label class="field"><span>Aksi Harga</span><select name="action" id="ghCentralAction"><option value="SET_DEFAULT">Tetapkan Default Pusat</option><option value="SET_OVERRIDE">Override Outlet Tertentu</option><option value="RESET_OVERRIDE">Kembalikan Outlet ke Default</option></select></label><label class="field is-hidden" id="ghCentralOutletField"><span>Outlet</span><select name="outletCode"><option value="">Pilih outlet</option>${outs.map(o=>`<option value="${esc(o.code)}">${esc(o.name)}</option>`).join('')}</select></label><label class="field" id="ghCentralPriceField"><span>Harga / Unit Terima</span><input name="price" type="number" min="0" step="1" placeholder="Contoh 12500"></label><label class="field"><span>Mulai Berlaku</span><input name="effectiveDate" type="date" value="${esc(today)}" required></label><label class="field"><span>Catatan</span><textarea name="note" placeholder="Contoh: kenaikan harga SKM supplier per 30 Agustus"></textarea></label><div id="ghCentralInfo" class="demo-box">Pilih bahan untuk melihat Harga Beli Terakhir, HPP Berjalan, Default Pusat, dan override.</div><div class="actions"><button class="btn btn-primary" type="submit">Simpan Aturan Harga</button><button class="btn btn-soft" type="button" id="ghCentralSync">Sinkron ke Outlet Sekarang</button></div></form><h4>Status Harga</h4><div id="ghCentralList" class="direct-list"></div>`);
    const f=$('#ghCentralPrice'),action=$('#ghCentralAction'),outletField=$('#ghCentralOutletField'),priceField=$('#ghCentralPriceField'),info=$('#ghCentralInfo'),list=$('#ghCentralList');
    const renderList=()=>{list.innerHTML=mats.map(x=>`<div class="direct-card"><b>${esc(x.name)}</b><small>Harga beli terakhir ${x.lastPurchaseDisplayPrice>0?rp(x.lastPurchaseDisplayPrice)+' / '+esc(x.lastPurchaseDisplayUnit||x.receiveUnit):'-'}${x.lastPurchaseDisplayPrice>0&&x.lastPurchaseEquivalentPrice>0&&x.lastPurchaseDisplayUnit!==x.receiveUnit?' · setara '+rp(x.lastPurchaseEquivalentPrice)+' / '+esc(x.receiveUnit):''} · HPP ${x.hppReceive>0?rp(x.hppReceive):'-'} / ${esc(x.receiveUnit)} · Default ${x.defaultPrice>0?rp(x.defaultPrice):'belum diset'}</small><small>${(x.overrides||[]).length?'Override: '+x.overrides.map(o=>`${esc(o.outletName)} ${rp(o.price)}`).join(' · '):'Semua outlet mengikuti default / legacy'}</small></div>`).join('')||'<div class="empty">Belum ada bahan.</div>'};renderList();
    const toggle=()=>{const ov=action.value!=='SET_DEFAULT';outletField.classList.toggle('is-hidden',!ov);priceField.classList.toggle('is-hidden',action.value==='RESET_OVERRIDE');};action.onchange=toggle;toggle();
    f.code.onchange=()=>{const x=mats.find(m=>m.code===f.code.value);if(!x){info.textContent='Pilih bahan.';return;}info.innerHTML=`<b>${esc(x.name)}</b><br>Harga Beli Terakhir: ${x.lastPurchaseDisplayPrice>0?rp(x.lastPurchaseDisplayPrice)+' / '+esc(x.lastPurchaseDisplayUnit||x.receiveUnit):'-'}${x.lastPurchaseDisplayPrice>0&&x.lastPurchaseEquivalentPrice>0&&x.lastPurchaseDisplayUnit!==x.receiveUnit?'<br>Setara: '+rp(x.lastPurchaseEquivalentPrice)+' / '+esc(x.receiveUnit):''}<br>HPP Berjalan: ${x.hppReceive>0?rp(x.hppReceive):'-'} / ${esc(x.receiveUnit)}<br>Harga Internal Warehouse: ${x.warehouseInternalPrice>0?rp(x.warehouseInternalPrice):'-'}<br>Default Pusat: ${x.defaultPrice>0?rp(x.defaultPrice)+' sejak '+esc(x.defaultEffectiveDate):'belum diset'}${(x.overrides||[]).length?'<br>Override: '+x.overrides.map(o=>`${esc(o.outletName)} ${rp(o.price)} sejak ${esc(o.effectiveDate)}`).join(' · '):''}`;if(action.value==='SET_DEFAULT'&&x.defaultPrice>0)f.price.value=String(x.defaultPrice);};
    f.onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(f).entries());if(p.action!=='RESET_OVERRIDE'&&!(Number(p.price)>0))return toast('Harga harus lebih dari 0.');if(p.action!=='SET_DEFAULT'&&!p.outletCode)return toast('Pilih outlet.');await writeDirect('centralPriceRule','saveCentralMaterialPrice',p);};
    $('#ghCentralSync').onclick=async()=>{try{let r;await withBusy('Menyinkronkan harga ke outlet…',async()=>{r=await callDirect('syncCentralMaterialPricesNow',{})});toast(`Sinkron harga selesai · ${r.changed||0} perubahan${(r.errors||[]).length?' · '+r.errors.length+' gagal':''}${r.hppSync?' · HPP Kasir '+(r.hppSync.success||0)+' outlet'+((r.hppSync.errors||[]).length?' ('+r.hppSync.errors.length+' gagal)':''):''}`);if((r.errors||[]).length)console.warn(r.errors)}catch(e){toast(e.message)}};
  }


  function directInternalPrice(){
    sheetHtml('Harga Internal Outlet',`<div class="role-guide"><b>Sinkron Harga Otomatis Bertingkat</b><span>Prioritas: Terima Bahan aktif → Master Bahan outlet → Harga Warehouse lama.</span><span>Konversi kg↔gr, liter↔ml, dan faktor unit canonical dilakukan otomatis. Konflik tetap ditahan agar tidak salah harga.</span></div><div class="actions"><button class="btn btn-primary" type="button" id="ghSyncPrice">Sinkron Harga Sekarang</button></div><div id="ghPricePreview"><div class="demo-box">Membaca Terima Bahan & Master Bahan outlet…</div></div>`);
    const render=async()=>{try{let r;await withBusy('Membaca sumber harga…',async()=>{r=await callDirect('previewOutletReceiptInternalPrices')});const st=r.stats||{},rows=(r.rows||[]).filter(x=>!['SAME','SAME_MASTER'].includes(x.status)),errors=r.errors||[];$('#ghPricePreview').innerHTML=`<div class="demo-box">Terima Bahan update ${st.ready||0} · Master update ${st.sourceMaster||0} · Sudah sama ${(st.same||0)+(st.sameMaster||0)} · Konflik ${(st.conflict||0)+(st.masterConflict||0)} · Perlu mapping ${st.unitMismatch||0} · Belum ada ${st.missing||0}</div>${errors.length?`<div class="demo-box">Auto-sync ditahan: ${errors.map(x=>`${esc(x.outletName||x.outletCode)} — ${esc(x.error)}`).join('<br>')}</div>`:''}<div class="direct-list">${rows.map(x=>{let status='BELUM ADA SUMBER';if(x.status==='READY')status=`Terima Bahan ${rp(x.suggestedPrice)} · akan update`;else if(x.status==='SOURCE_MASTER')status=`Master Bahan ${rp(x.suggestedPrice)} · akan update`;else if(x.status==='CONFLICT')status='KONFLIK TERIMA BAHAN';else if(x.status==='MASTER_CONFLICT')status='KONFLIK MASTER';else if(x.status==='UNIT_MISMATCH')status='PERLU MAPPING UNIT';return `<div class="direct-card"><b>${esc(x.name)}</b><small>Warehouse ${Number(x.currentPrice||0)>0?rp(x.currentPrice):'BELUM DISET'} · ${status}</small></div>`}).join('')||'<div class="empty">Semua harga yang tersedia sudah sinkron.</div>'}</div>`}catch(e){$('#ghPricePreview').innerHTML=`<div class="demo-box">${esc(e.message)}</div>`;toast(e.message)}};
    $('#ghSyncPrice').onclick=async()=>{try{await writeDirect('syncPrice','syncOutletReceiptInternalPricesNow',{})}catch(_){}};render();
  }
  function directUsers(){
    if(currentRole()!=='OWNER')return toast('Pengelolaan pengguna hanya untuk Owner.','warning');
    const users=(state.data||{}).users||[];
    const counts={active:users.filter(x=>x.active==='YA').length,inactive:users.filter(x=>x.active!=='YA').length};
    const cards=users.map(u=>{
      const active=u.active==='YA',self=String(u.id)===String(((state.data||{}).user||{}).id);
      return '<div class="ww-user-card"><div class="ww-user-avatar">'+esc((u.name||'?').trim().slice(0,1).toUpperCase())+'</div><div class="ww-user-info"><b>'+esc(u.name)+'</b>'+
      '<small>@'+esc(u.username)+' · '+esc(roleName(u.role))+'</small><span class="badge '+(active?'ok':'warn')+'">'+(active?'AKTIF':'NONAKTIF')+'</span></div>'+
      '<div class="ww-user-actions"><button class="btn btn-line" data-ww-user-edit="'+esc(u.id)+'" type="button">Ubah</button>'+
      '<button class="btn btn-soft" data-ww-user-toggle="'+esc(u.id)+'" type="button" '+(self?'disabled title="Akun yang sedang dipakai tidak dapat dinonaktifkan"':'')+'>'+(active?'Nonaktifkan':'Aktifkan')+'</button></div></div>';
    }).join('');
    const roleOpts=[['ADMIN','Admin Legacy (kompatibilitas)'],['ADMIN_1','Admin 1 · Keuangan'],['ADMIN_2','Admin 2 · Gudang'],['STAFF_GUDANG','Staff Gudang'],['STAFF_LOGISTIK','Logistik'],['FINANCE','Finance'],['HR','HR'],['OWNER','Owner']];
    sheetHtml('Pengguna & Peran',
      '<div class="ww-users-overview"><b>Pengelolaan Akun Warehouse</b><span>'+num(counts.active,0)+' aktif · '+num(counts.inactive,0)+' nonaktif</span><p>Nonaktifkan akun tanpa menghapus transaksi, histori, atau hak akses inti sistem. Akun dapat diaktifkan kembali.</p></div>'+
      '<div class="ww-users-toolbar"><button class="btn btn-primary" id="wwNewUser" type="button">+ Tambah Pengguna</button></div>'+
      '<form id="wwUserForm" class="ww-user-form" hidden><b id="wwUserFormTitle">Pengguna Baru</b>'+
      '<label class="field"><span>Nama pengguna</span><input name="name" required maxlength="80"></label>'+
      '<label class="field"><span>Username</span><input name="username" required maxlength="60" autocomplete="off"></label>'+
      '<label class="field"><span>Peran</span><select name="role">'+roleOpts.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('')+'</select></label>'+
      '<label class="field"><span>PIN <small id="wwPinHint">Wajib untuk pengguna baru</small></span><input name="pin" type="password" inputmode="numeric" autocomplete="new-password"></label>'+
      '<div class="actions"><button class="btn btn-line" type="button" id="wwCancelUserEdit">Batal</button><button class="btn btn-primary" type="submit">Simpan Pengguna</button></div></form>'+
      '<div class="ww-user-list">'+(cards||'<div class="empty">Belum ada pengguna.</div>')+'</div>',
      {key:'user-management-v1522'});
    const form=$('#wwUserForm');
    const open=(u)=>{
      form.hidden=false;form.dataset.editUserId=u?String(u.id):'';
      form.elements.name.value=u?u.name:'';
      form.elements.username.value=u?u.username:'';
      form.elements.username.readOnly=!!u;
      form.elements.role.value=u?u.role:'ADMIN_2';
      form.elements.pin.value='';
      form.elements.pin.required=!u;
      $('#wwUserFormTitle').textContent=u?'Ubah Pengguna · '+u.name:'Tambah Pengguna';
      $('#wwPinHint').textContent=u?'Kosongkan jika PIN tidak berubah':'Wajib untuk pengguna baru';
      form.scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    $('#wwNewUser').onclick=()=>open(null);
    $('#wwCancelUserEdit').onclick=()=>{form.hidden=true;form.dataset.editUserId='';};
    $$('[data-ww-user-edit]').forEach(b=>b.onclick=()=>{const u=users.find(x=>String(x.id)===b.dataset.wwUserEdit);if(u)open(u);});
    $$('[data-ww-user-toggle]').forEach(b=>b.onclick=async()=>{
      const u=users.find(x=>String(x.id)===b.dataset.wwUserToggle);
      if(!u||String(u.id)===String(((state.data||{}).user||{}).id))return;
      const next=u.active==='YA'?false:true;
      if(!window.confirm((next?'AKTIFKAN kembali':'NONAKTIFKAN')+' akun '+u.name+' (@'+u.username+')? Histori tidak akan dihapus.'))return;
      try{await writeDirect('userStatus_'+u.id,'saveUser',{username:u.username,name:u.name,role:u.role,pin:'',active:next});}
      catch(_){}
    });
    form.onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(form),isEdit=!!form.dataset.editUserId;
      const payload={name:String(fd.get('name')||'').trim(),username:String(fd.get('username')||'').trim(),role:fd.get('role'),pin:String(fd.get('pin')||''),active:true};
      if(!payload.name||!payload.username||(!isEdit&&!payload.pin))return toast('Lengkapi data pengguna dan PIN baru.','warning');
      const prev=isEdit?users.find(x=>String(x.id)===form.dataset.editUserId):null;
      if(prev&&prev.active!=='YA')payload.active=false;
      try{await writeDirect('userSave_'+payload.username,'saveUser',payload);}
      catch(_){}
    };
  }
  // v4.3 · Integrated audit panel. Explicit user action, read-only backend calls.
  function directAudit(){
    const buttons=[
      ['ghAudit1260','Audit Operasional','auditWarehouseAppV1260',true],
      ['ghAuditReceipt','Diagnostik Penerimaan','auditReceiptSyncDiagnosticAppV1260',true],
      ['ghAuditStockV43','Audit Stok & HPP','auditWarehouseStockCanonicalAppV1409',true],
      ['ghAuditReceivableV43','Audit Piutang SJ','auditWarehouseReceivableCanonicalAppV1405',true],
      ['ghAuditFinanceV43','Audit Keuangan & Hutang','auditWarehouseFinanceCanonicalAppV1409',roleCan('FINANCE_REPORT')]
    ];
    const allowed=buttons.filter(x=>x[3]);
    sheetHtml('Pusat Pemeriksaan Warehouse',
      '<div class="role-guide"><b>READ-ONLY · Tidak mengubah saldo atau ledger</b>'+
      '<span>Pilih audit stok/HPP, piutang Surat Jalan atau keuangan. Hasil audit tidak mengoreksi data. Bila menemukan selisih, hentikan posting koreksi sampai transaksi penyebab tervalidasi.</span></div>'+
      '<div class="ww-ops-audit-grid">'+allowed.map(x=>'<button class="btn btn-soft" type="button" id="'+x[0]+'">'+esc(x[1])+'</button>').join('')+'</div>'+
      '<div class="ww-ops-audit-status" id="ghAuditStatus">Belum diperiksa. Pilih salah satu audit.</div>'+
      '<pre id="ghAuditOut" class="audit-pre">Hasil per audit akan tampil di sini.</pre>'
    );
    allowed.forEach(item=>{
      const btn=$('#'+item[0]);if(!btn)return;
      btn.onclick=async()=>{
        const status=$('#ghAuditStatus'),out=$('#ghAuditOut');
        try{
          status.textContent='Memeriksa '+item[1]+'…';
          btn.disabled=true;
          let result;
          await withBusy('Audit baca-saja: '+item[1],async()=>{result=await callDirect(item[2]);});
          if(!result||result.readOnly!==true)throw new Error('Audit tidak mengonfirmasi status read-only, hasil tidak digunakan.');
          const n=Array.isArray(result.issues)?result.issues.length:0;
          const warning=Array.isArray(result.warnings)?result.warnings.length:0;
          status.textContent=item[1]+' · '+(result.ok===false?'PERLU TINDAK LANJUT':n?'ADA MASALAH':'Hasil audit tersedia')+
            ' · '+n+' isu · '+warning+' peringatan · TIDAK ADA POSTING';
          const raw=JSON.stringify(result,null,2);
          out.textContent=raw.length>80000?raw.slice(0,80000)+'\n\n… Detail panjang, hasil dipotong untuk menjaga performa HP.':raw;
        }catch(err){
          status.textContent=item[1]+' · GAGAL DIBACA, DATA TIDAK DIUBAH';
          out.textContent=String(err&&err.message||err);
          toast('Audit belum selesai: '+String(err&&err.message||err),'warning');
        }finally{btn.disabled=false;}
      };
    });
  }
  function directRecovery(){const dash=(state.data||{}).dashboard||{};sheetHtml('Antrean Pemulihan',`<div class="demo-box"><b>${num(dash.recoveryPending||0)}</b> transaksi menunggu pemulihan. Recovery engine tetap berjalan di backend dan tidak boleh dihapus manual.</div>`)}
  async function directFinanceActualV1300(){
    let r;await withBusy('Membaca posisi dana…',async()=>{r=await callDirect('getFinancialPositionActualV1300')});const a=r.actual||null,d=r.currentDifference||null,stale=r.actualStale,canWrite=!!r.canWrite;const badge=(v)=>Math.abs(Number(v||0))<0.5?'<span class="badge ok">Rp0 · SESUAI</span>':`<span class="badge bad">Selisih ${rp(v)}</span>`;
    sheetHtml('Posisi Dana Warehouse',`<div class="role-guide"><b>Sederhana: isi saldo yang benar sekarang</b><span>Masukkan saldo rekening Bank dan uang fisik Kas Gudang yang benar. Saat disimpan, Saldo Sistem langsung disamakan ke angka ini melalui koreksi ledger yang tercatat di Audit.</span><span>Saldo Awal tetap Rp0. Stok, HPP, Surat Jalan, piutang, hutang, dan data outlet tidak berubah.</span></div>${stale?'<div class="demo-box"><b>Perlu cek ulang.</b><br>Ada transaksi Bank/Kas setelah posisi terakhir disimpan.</div>':''}<div class="stats-mini"><div class="demo-box"><b>Bank Warehouse</b><br>Sistem ${rp(r.system.bank)}<br>Posisi terakhir ${a?rp(a.bankActual):'Belum diinput'}<br>${a?badge(d.bank):''}</div><div class="demo-box"><b>Kas Gudang</b><br>Sistem ${rp(r.system.cash)}<br>Posisi terakhir ${a?rp(a.cashActual):'Belum diinput'}<br>${a?badge(d.cash):''}</div></div>${a?`<div class="demo-box">Terakhir disimpan ${esc(a.time)} oleh ${esc(a.user)}${a.note?'<br>'+esc(a.note):''}</div>`:''}${canWrite?`<form id="ghFinanceActual"><label class="field"><span>Saldo Bank Sekarang</span><input name="bankActual" type="number" min="0" step="1" value="${a?Number(a.bankActual):Math.max(0,Number(r.system.bank||0))}" required></label><label class="field"><span>Kas Gudang Sekarang</span><input name="cashActual" type="number" min="0" step="1" value="${a?Number(a.cashActual):Math.max(0,Number(r.system.cash||0))}" required></label><label class="field"><span>Catatan</span><textarea name="note" placeholder="Contoh: posisi sesuai mobile banking dan kas fisik"></textarea></label><button class="btn btn-primary">Simpan Posisi Sekarang</button></form>`:'<div class="demo-box">Mode baca saja. Hanya Owner yang dapat mengubah posisi dana.</div>'}`);
    const f=$('#ghFinanceActual');if(f)f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),idem=idemKey('finance_actual');beginBusy('Menyamakan saldo sistem…');try{await bridge.call('saveFinancialPositionActualV1300',state.token,{bankActual:fd.get('bankActual'),cashActual:fd.get('cashActual'),note:fd.get('note')},idem);localStorage.removeItem('ww_gh_idem_finance_actual');toast('Posisi dana tersimpan. Saldo sistem sudah disamakan.');closeSheet();refreshBootstrapLight().catch(()=>{});}catch(err){toast(err.message)}finally{endBusy()}};
  }
  let lastStockReportV1300=null;
  function todayIsoV1300(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
  async function directStockReportV1300(){
    sheetHtml('Laporan Stok Warehouse',`<div class="role-guide"><b>Laporan dari ledger canonical</b><span>Pembelian dihitung dari event PURCHASE. Barang keluar outlet dihitung dari DISTRIBUTION_DISPATCH dan dipisah per outlet melalui Surat Jalan.</span><span>Mode Mingguan = Senin–Minggu. Mode Bulanan = tanggal 1 sampai akhir bulan.</span></div><form id="ghStockReport"><div class="form-2"><label class="field"><span>Periode</span><select name="mode"><option value="WEEK">Mingguan</option><option value="MONTH">Bulanan</option></select></label><label class="field"><span>Tanggal acuan</span><input type="date" name="anchorDate" value="${todayIsoV1300()}" required></label></div><button class="btn btn-primary">Buat Laporan</button></form><div id="ghStockReportResult"></div>`);
    $('#ghStockReport').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),box=$('#ghStockReportResult');let r;await withBusy('Menghitung laporan stok…',async()=>{r=await callDirect('getWarehouseStockMovementReportV1300',{mode:fd.get('mode'),anchorDate:fd.get('anchorDate')})});lastStockReportV1300=r;const rows=r.rows||[];box.innerHTML=`<div class="demo-box"><b>${esc(r.period.startDate)} s/d ${esc(r.period.endDate)}</b><br>Pembelian ${rp(r.summary.purchaseValue)} · Keluar outlet (HPP) ${rp(r.summary.outboundHppValue)}<br>Nilai stok awal ${rp(r.summary.openingStockValue)} → akhir ${rp(r.summary.closingStockValue)}${r.unmappedDispatchCount?'<br><b>Perhatian:</b> '+num(r.unmappedDispatchCount)+' dispatch belum terpetakan outlet.':''}</div><div class="direct-list">${rows.map(x=>`<div class="direct-card"><b>${esc(x.name)}</b><small>${esc(x.code)} · Stok awal ${num(x.openingQtyUnit)} ${esc(x.receiveUnit)} → akhir ${num(x.closingQtyUnit)} ${esc(x.receiveUnit)}</small><small>Dibeli <b>${num(x.purchaseQtyUnit)} ${esc(x.receiveUnit)}</b> (${rp(x.purchaseValue)}) · Keluar outlet <b>${num(x.outletQtyUnit)} ${esc(x.receiveUnit)}</b> (${rp(x.outletHppValue)} HPP)</small>${(x.outlets||[]).length?`<small>${x.outlets.map(o=>`${esc(o.outletName)}: ${num(o.qtyUnit)} ${esc(x.receiveUnit)}`).join(' · ')}</small>`:''}</div>`).join('')||'<div class="empty">Tidak ada pergerakan stok pada periode ini.</div>'}</div>${(r.issues||[]).length?`<div class="demo-box"><b>Audit warning</b><br>${r.issues.map(esc).join('<br>')}</div>`:''}<div class="actions"><button class="btn btn-soft" id="ghPrintStockReport">Cetak / Simpan PDF</button></div>`;$('#ghPrintStockReport').onclick=()=>printStockReportV1300(r);};
  }
  function printStockReportV1300(r){
    if(!r)return toast('Buat laporan lebih dulu.');const w=window.open('','_blank','width=980,height=760');if(!w)return toast('Popup print diblokir browser.');const rows=r.rows||[];const tr=rows.map(x=>`<tr><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${num(x.openingQtyUnit)} ${esc(x.receiveUnit)}</td><td>${num(x.purchaseQtyUnit)} ${esc(x.receiveUnit)}</td><td>${num(x.outletQtyUnit)} ${esc(x.receiveUnit)}</td><td>${num(x.closingQtyUnit)} ${esc(x.receiveUnit)}</td><td>${rp(x.purchaseValue)}</td><td>${rp(x.outletHppValue)}</td><td>${(x.outlets||[]).map(o=>`${esc(o.outletName)} ${num(o.qtyUnit)}`).join(', ')}</td></tr>`).join('');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Laporan Stok Warehouse</title><style>@page{size:A4 landscape;margin:10mm}body{font:12px Arial;color:#111}h1{margin:0 0 4px}p{margin:3px 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}th{background:#eee}.summary{margin:12px 0;padding:10px;border:1px solid #bbb}</style></head><body><h1>Wills Warehouse — Laporan Stok</h1><p>${esc(r.period.startDate)} s/d ${esc(r.period.endDate)} · ${r.period.mode==='WEEK'?'Mingguan':'Bulanan'}</p><div class="summary">Nilai stok awal ${rp(r.summary.openingStockValue)} · Pembelian ${rp(r.summary.purchaseValue)} · Keluar outlet/HPP ${rp(r.summary.outboundHppValue)} · Nilai stok akhir ${rp(r.summary.closingStockValue)}</div><table><thead><tr><th>Kode</th><th>Bahan</th><th>Stok Awal</th><th>Dibeli</th><th>Keluar Outlet</th><th>Stok Akhir</th><th>Nilai Beli</th><th>Nilai Keluar HPP</th><th>Breakdown Outlet</th></tr></thead><tbody>${tr}</tbody></table></body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),150);
  }
  function directDispatchRecapV1320(){
    const outlets=(state.data||{}).outlets||[];
    sheetHtml('Rekap Pengiriman Outlet',`<div class="role-guide"><b>Pengecekan kiriman berdasarkan tanggal</b><span>Data berasal dari event DISTRIBUTION_DISPATCH pada Ledger Stok canonical dan dipetakan ke Surat Jalan.</span><span>Hanya barang yang benar-benar sudah dikirim (dispatch POSTED) yang dihitung. Dispatch yang sudah direversal tidak masuk rekap.</span></div><form id="ghDispatchRecap"><div class="form-2"><label class="field"><span>Periode</span><select name="mode" id="ghDispatchMode"><option value="DAY">Harian</option><option value="WEEK">Mingguan</option><option value="MONTH">Bulanan</option><option value="RANGE">Rentang Tanggal</option></select></label><label class="field"><span>Tanggal acuan</span><input type="date" name="anchorDate" value="${todayIsoV1300()}" required></label></div><div class="form-2" id="ghDispatchRange" hidden><label class="field"><span>Dari tanggal</span><input type="date" name="fromDate" value="${todayIsoV1300()}"></label><label class="field"><span>Sampai tanggal</span><input type="date" name="toDate" value="${todayIsoV1300()}"></label></div><label class="field"><span>Outlet</span><select name="outletCode"><option value="">Semua Outlet</option>${outlets.filter(x=>x.active==='YA').map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('')}</select></label><button class="btn btn-primary">Tampilkan Rekap</button></form><div id="ghDispatchRecapResult"></div>`);
    const mode=$('#ghDispatchMode'),range=$('#ghDispatchRange');mode.onchange=()=>{range.hidden=mode.value!=='RANGE';};
    $('#ghDispatchRecap').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),box=$('#ghDispatchRecapResult'),payload={mode:fd.get('mode'),anchorDate:fd.get('anchorDate'),fromDate:fd.get('fromDate'),toDate:fd.get('toDate'),outletCode:fd.get('outletCode')};let r;await withBusy('Membaca rekap pengiriman…',async()=>{r=await callDirect('getWarehouseOutletDispatchRecapV1320',payload)});const groups=r.groups||[];box.innerHTML=`<div class="demo-box"><b>${esc(r.period.startDate)} s/d ${esc(r.period.endDate)}</b><br>${num(r.summary.sjCount,0)} Surat Jalan · ${num(r.summary.outletCount,0)} outlet · ${num(r.summary.itemLines,0)} baris bahan${r.skippedReversedDispatchCount?'<br>'+num(r.skippedReversedDispatchCount,0)+' dispatch reversal tidak dihitung.':''}${r.unmappedDispatchCount?'<br><b>Perhatian:</b> '+num(r.unmappedDispatchCount,0)+' dispatch belum terpetakan ke Surat Jalan.':''}</div>${groups.length?groups.map(g=>`<section class="dispatch-recap-group"><div class="dispatch-recap-head"><div><b>${esc(formatIdDateV1320(g.date))}</b><small>${esc(g.outletName)} · ${num(g.sjCount,0)} SJ</small></div><span class="badge status-sent">DIKIRIM</span></div><div class="direct-list">${(g.items||[]).map(x=>`<div class="direct-card dispatch-item"><b>${esc(x.name)}</b><small>${esc(x.code)} · ${num(x.qtyBase)} ${esc(x.baseUnit)}</small><strong>${num(x.qtyUnit)} ${esc(x.receiveUnit)}</strong></div>`).join('')}</div></section>`).join(''):'<div class="empty">Tidak ada bahan yang dikirim pada periode/filter tersebut.</div>'}`;};
  }
  function formatIdDateV1320(v){const d=new Date(String(v||'')+'T12:00:00');return isNaN(d.getTime())?String(v||''):new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(d);}
  function directHistoricalHppCorrection(){
    if(currentRole()!=='OWNER')return toast('Koreksi HPP historis hanya untuk Owner.');
    const mats=((state.data||{}).materials||[]).filter(x=>x.active==='YA');
    sheetHtml('Koreksi HPP Historis',`<div class="role-guide"><b>Tidak mengubah stok sekarang</b><span>Fitur ini membuat ledger koreksi cost terpisah dan memperbarui snapshot cost Surat Jalan/Transit. Ledger Stok asli tetap utuh sebagai audit.</span></div><form id="ghHppCorr"><label class="field"><span>Bahan</span><select name="code" required><option value="">Pilih bahan</option>${mats.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.receiveUnit)}</option>`).join('')}</select></label><div class="form-2"><label class="field"><span>Dari tanggal</span><input name="from" type="date" required></label><label class="field"><span>Sampai tanggal</span><input name="to" type="date" required></label></div><label class="field"><span>HPP koreksi / unit terima</span><input name="correctedCostReceive" type="text" inputmode="decimal" autocomplete="off" placeholder="Contoh: 18035.71" required></label><label class="field"><span>Alasan</span><textarea name="reason" required placeholder="Contoh: koreksi PURCHASE salah input karton sebagai pcs"></textarea></label><div class="actions"><button class="btn btn-soft" type="button" id="ghHppPreview">Preview</button><button class="btn btn-primary" type="submit">Posting Koreksi HPP</button></div><div id="ghHppResult"></div></form>`);
    const form=$('#ghHppCorr'),result=$('#ghHppResult'),payload=()=>{const p=Object.fromEntries(new FormData(form).entries());p.correctedCostReceive=parsePositiveDecimal_(p.correctedCostReceive,'HPP koreksi');return p;};
    const preview=async()=>{let r;await withBusy('Menghitung histori HPP…',async()=>{r=await callDirect('previewHistoricalHppCorrection',payload())});result.innerHTML=`<div class="demo-box"><b>${r.items.length}</b> dispatch · cost lama ${rp(r.totalOld)} → koreksi ${rp(r.totalNew)} · delta ${rp(r.totalDelta)}</div><div class="direct-list">${r.items.slice(0,20).map(x=>`<div class="direct-card"><b>${esc(x.time)} · ${esc(x.txnId)}</b><small>${num(x.qtyBase)} ${esc(r.baseUnit)} · ${rp(x.oldCost)} → ${rp(x.newCost)}</small></div>`).join('')}</div>`;return r;};
    $('#ghHppPreview').onclick=preview;form.onsubmit=async e=>{e.preventDefault();const r=await preview();if(!r.items.length)return toast('Tidak ada dispatch untuk dikoreksi.');if(!window.confirm(`Posting koreksi HPP untuk ${r.items.length} dispatch? Stok sekarang tidak berubah.`))return;await writeDirect('hppCorrection','postHistoricalHppCorrection',payload());};
  }
  function directMaterials(){
    const mats=(state.data||{}).materials||[],stock={};((state.data||{}).stock||[]).forEach(x=>stock[x.code]=x);
    sheetHtml('Master Bahan Wills',`<div class="role-guide"><b>HPP Bahan Otomatis</b><span>Harga modal berjalan dihitung dengan metode moving average dari Ledger Stok. Saat Belanja Bahan diposting dengan harga baru, HPP berjalan ikut berubah otomatis.</span><span>Harga Internal Outlet tetap terpisah dari HPP modal agar margin dan histori tidak tercampur.</span></div><div class="direct-list">${mats.map(x=>{const st=stock[x.code]||{},hppBase=Number(st.avgCost||0),hppReceive=hppBase*Number(x.factor||1);return `<div class="direct-card"><b>${esc(x.name)}</b><small>${esc(x.code)} · 1 ${esc(x.receiveUnit)} = ${num(x.factor)} ${esc(x.baseUnit)}</small><small>HPP berjalan: ${hppReceive>0?rp(hppReceive)+' / '+esc(x.receiveUnit):'belum tersedia'}${Number(x.internalPrice||0)>0?' · Harga internal '+rp(x.internalPrice):''}</small></div>`}).join('')}</div>`)
  }
  function closeSheet(options = {}){
    const root=$('#sheetRoot');if(!root||!root.children.length)return;
    if(options.immediate===true||!appHistoryReady||sheetHistoryDepth<=0){restorePreviousSheetLayer(null);return;}
    history.back();
  }


  let busyShowTimer = null;
  // v4.4: in-bar activity indicator; no fullscreen spinner overlay.
  function busyInlineV44(label) {
    const inSheet=$('#sheetRoot .sheet-backdrop:last-child .sheet-head');
    const target=inSheet||$('#mainView:not(.is-hidden) .topbar')||$('#loginView .auth-card');
    if(!target)return false;
    let el=$('#wwInlineBusyV44');
    if(!el){
      el=document.createElement('span');el.id='wwInlineBusyV44';el.className='ww-inline-busy-v44';
      el.setAttribute('role','status');el.setAttribute('aria-live','polite');
      const spin=document.createElement('span');spin.className='ww-inline-spinner-v44';spin.setAttribute('aria-hidden','true');
      const text=document.createElement('span');text.className='ww-inline-label-v44';
      el.append(spin,text);
    }
    if(el.parentElement!==target)target.appendChild(el);
    el.querySelector('.ww-inline-label-v44').textContent=String(label||'Memproses…');
    return true;
  }
  function beginBusy(label='Memuat…') {
    busyDepth+=1;
    const text=$('#busyText');if(text)text.textContent=label;
    clearTimeout(busyShowTimer);
    busyShowTimer=setTimeout(()=>{
      if(busyDepth<=0)return;
      const placed=busyInlineV44(label);
      const root=$('#busyRoot');
      if(root)root.classList.toggle('is-hidden',placed);
      // Deliberately do NOT set app-busy or block the whole screen.
    },180);
  }
  function endBusy() {
    busyDepth=Math.max(0,busyDepth-1);
    if(busyDepth>0)return;
    clearTimeout(busyShowTimer);busyShowTimer=null;
    const chip=$('#wwInlineBusyV44');if(chip)chip.remove();
    const root=$('#busyRoot');if(root)root.classList.add('is-hidden');
    document.documentElement.classList.remove('app-busy');
  }
  async function withBusy(label, fn) { beginBusy(label); try { return await fn(); } finally { endBusy(); } }


  function toast(message, typeOrDuration = 'info', durationOverride = 0) {
    const text=String(message==null?'':message).trim();if(!text)return;
    let type='info',duration=0;
    if(typeof typeOrDuration==='number')duration=Number(typeOrDuration||0);else type=String(typeOrDuration||'info').toLowerCase();
    if(!['success','warning','error','info'].includes(type))type=/gagal|error|tidak dapat|waktu habis|timeout/i.test(text)?'error':(/selisih|peringatan|menunggu/i.test(text)?'warning':(/berhasil|tersimpan|siap digunakan/i.test(text)?'success':'info'));
    if(!duration)duration=Number(durationOverride||({success:6000,warning:9000,error:12000,info:6000}[type]));
    toastQueue.push({message:text,duration:Math.max(4500,duration),type});showNextToast();
  }
  function wwAttachSwipeToastV1522(node,close){
    if(!node||node.dataset.wwSwipeReady==='1')return;
    node.dataset.wwSwipeReady='1';
    let x0=0,y0=0,tracking=false;
    node.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;x0=e.clientX;y0=e.clientY;tracking=true;},{passive:true});
    node.addEventListener('pointermove',e=>{
      if(!tracking)return;const dx=e.clientX-x0,dy=e.clientY-y0;
      if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>12)node.style.transform='translateX('+Math.max(-220,Math.min(220,dx))+'px)';
    },{passive:true});
    const end=e=>{
      if(!tracking)return;tracking=false;
      if(Math.abs(e.clientX-x0)>72&&Math.abs(e.clientX-x0)>Math.abs(e.clientY-y0)){node.style.transform='';close();return;}
      node.style.transform='';
    };
    node.addEventListener('pointerup',end,{passive:true});
    node.addEventListener('pointercancel',()=>{tracking=false;node.style.transform='';},{passive:true});
  }
  window.wwAttachSwipeToastV1522=wwAttachSwipeToastV1522;
  function showNextToast() {
    if(toastShowing||!toastQueue.length)return;
    toastShowing=true;
    const item=toastQueue.shift(),root=$('#toastRoot');
    if(!root){toastShowing=false;return;}
    root.innerHTML='<div class="toast '+esc(item.type)+'"><span>'+esc(item.message)+'</span><button type="button" class="toast-close" aria-label="Tutup">×</button></div>';
    let finished=false;
    const finish=()=>{
      if(finished)return;finished=true;
      clearTimeout(window.__wwToastTimer);root.innerHTML='';toastShowing=false;setTimeout(showNextToast,120);
    };
    const btn=root.querySelector('.toast-close');if(btn)btn.onclick=finish;
    wwAttachSwipeToastV1522(root.querySelector('.toast'),finish);
    window.__wwToastTimer=setTimeout(finish,item.duration);
  }

  function initAppHistory() {
    if (appHistoryReady) return;
    history.replaceState({ willsWarehouse: true, page: 'home', base: true }, document.title);
    history.pushState({ willsWarehouse: true, page: 'home', guard: true }, document.title);
    appHistoryReady = true;
    sheetHistoryDepth = 0; sheetViewStack.splice(0,sheetViewStack.length); pendingAfterSheetBack = null;
    lastBackAt = 0;
  }


  window.addEventListener('popstate', event => {
    if (!appHistoryReady || $('#mainView').classList.contains('is-hidden')) return;
    if ($('#sheetRoot').children.length) {
      restorePreviousSheetLayer(event);
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
    if (!inventoryOnlyV1520() && Number(dash.packingWageCount || 0) > 0) count += 1;
    if(wwDraftSjCountV15211((state.data||{}).deliveries)>0)count += 1;
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
    const alerts = stockAlerts();
    const dash = state.data && state.data.dashboard || {};
    const stockHtml = alerts.length ? alerts.map(x => {
      const isCritical = x.status === 'Kritis';
      const minText = Number(x.minimum || 0) > 0 ? ` · Batas minimum ${num(x.minimum)} ${esc(x.unit)}` : '';
      return `<div class="notice-row"><span class="notice-icon ${isCritical ? 'bad' : ''}">${icons.warning}</span><div class="notice-copy"><b>${esc(x.name)}</b><small>${esc(x.code)} · Stok ${num(x.qty)} ${esc(x.unit)}${minText}</small></div><div class="notice-side"><strong>${num(x.qty)} ${esc(x.unit)}</strong><span class="badge ${isCritical ? 'bad' : 'warn'}">${esc(x.status)}</span></div></div>`;
    }).join('') : '<div class="notice-ok">Semua stok bahan masih dalam kondisi aman.</div>';


    const other = [];
    if (Number(dash.recoveryPending || 0) > 0) other.push(`<div class="notice-row"><span class="notice-icon bad">${icons.warning}</span><div class="notice-copy"><b>Pemulihan transaksi</b><small>Ada transaksi yang perlu diperiksa sistem.</small></div><div class="notice-side"><strong>${num(dash.recoveryPending,0)}</strong><span class="badge bad">PERIKSA</span></div></div>`);
    if (!inventoryOnlyV1520() && Number(dash.packingWageCount || 0) > 0) other.push(`<div class="notice-row"><span class="notice-icon">${icons.money}</span><div class="notice-copy"><b>Upah packing belum dibayar</b><small>${num(dash.packingWageCount,0)} kewajiban upah masih terbuka.</small></div><div class="notice-side"><strong>${compactRp(dash.packingWageOutstanding)}</strong><span class="badge warn">BELUM LUNAS</span></div></div>`);
    const req=((state.data||{}).deliveries||[]).filter(x=>x.sjId&&String(x.status||'').trim().toUpperCase()==='DRAFT');
    if(req.length) other.push(`<div class="notice-row"><span class="notice-icon">${icons.truck}</span><div class="notice-copy"><b>Surat Jalan DRAFT</b><small>${req.slice(0,4).map(x=>esc(x.outletName)+' · '+num((x.lines||[]).length,0)+' bahan').join('<br>')}${req.length>4?'<br>+'+(req.length-4)+' SJ DRAFT lainnya':''}</small></div><div class="notice-side"><strong>${req.length}</strong><span class="badge warn">DRAFT</span></div></div>`);


    if(wwQueueV1526&&wwQueueV1526.counts){
      const n=wwQueueV1526.counts;
      if(Number(n.IN_TRANSIT||0)>0)other.push('<div class="notice-row"><span class="notice-icon">'+icons.truck+'</span><div class="notice-copy"><b>Pengiriman / Penerimaan Outlet</b><small>'+num(n.IN_TRANSIT,0)+' permintaan sedang diproses. Penerimaan mengikuti catatan barista di outlet.</small></div></div>');
    }
    sheetHtml('Pemberitahuan',`<div class="notice-section"><div class="notice-heading"><b>Bahan yang perlu dibelanja</b><span>${alerts.length} bahan</span></div><div class="notice-list">${stockHtml}</div></div>${other.length ? `<div class="notice-section"><div class="notice-heading"><b>Perlu perhatian</b><span>${other.length} pemberitahuan</span></div><div class="notice-list">${other.join('')}</div></div>` : ''}<div class="notice-summary">Daftar belanja mengikuti status stok <b>Kritis</b> dan <b>Menipis</b> dari sistem gudang. Nama bahan dan jumlah stok ditampilkan langsung agar Admin bisa menindaklanjuti tanpa menebak itemnya.</div>`,{key:'notifications'});
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
    const cached=readBootstrapSnapshotV1360(token);
    if(cached){
      applyAppDataV1360(token,cached,true);
      // Jangan menahan layar. Validasi sesi + data fresh berjalan di background.
      bridge.call('getAppSessionShellV1360',token).then(shell=>{
        state.data=normalizeShellDataV1360(shell,state.data);$('#profileBtn').textContent=initials((state.data.user&&state.data.user.name)||'WW');
        return refreshBootstrapLight();
      }).then(()=>{setTimeout(()=>{['delivery','purchase'].forEach(name=>ensureModule(name).catch(()=>{}));},60);}).catch(err=>{
        if(isSessionErrorV1360(err))invalidateSessionV1360('Sesi berakhir. Silakan login kembali.');
        else console.warn('[Wills Warehouse] background refresh:',err&&err.message||err);
      });
      if(!silent)toast('Sistem siap. Data terbaru disinkronkan di belakang.','success');return true;
    }
    try {
      // First-load / cache kosong: validasi shell ringan dulu, tampilkan app, lalu bootstrap berat di background.
      const shell=await bridge.call('getAppSessionShellV1360',token);
      state.moduleReady=Object.create(null);state.modulePromises=Object.create(null);applyAppDataV1360(token,shell,false);
      refreshBootstrapLight().then(()=>{setTimeout(()=>{['delivery','purchase'].forEach(name=>ensureModule(name).catch(()=>{}));},60);}).catch(err=>console.warn('[Wills Warehouse] bootstrap fresh:',err&&err.message||err));
      if(!silent)toast('Sistem siap digunakan.','success');return true;
    } catch (err) {
      if(isSessionErrorV1360(err))invalidateSessionV1360('Sesi berakhir. Silakan login kembali.');
      else if(!silent)toast(err.message);return false;
    }
  }


  function initials(name) {
    return String(name || 'WW').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || 'WW';
  }


  async function boot() {
    const existing=localStorage.getItem(TOKEN_KEY)||'';
    const cached=existing?readBootstrapSnapshotV1360(existing):null;
    // Render snapshot bahkan sebelum iframe bridge selesai handshake.
    if(existing&&cached)applyAppDataV1360(existing,cached,true);
    try {
      await bridge.init();setAuthStatus(true);
      bridge.call('getPublicState').then(pub=>{state.publicState=pub;}).catch(err=>console.warn('[Wills Warehouse] public state:',err.message));
      if(existing){
        if(cached){
          bridge.call('getAppSessionShellV1360',existing).then(shell=>{state.data=normalizeShellDataV1360(shell,state.data);return refreshBootstrapLight();}).catch(err=>{if(isSessionErrorV1360(err))invalidateSessionV1360('Sesi berakhir. Silakan login kembali.');});
          setTimeout(()=>{['delivery','purchase'].forEach(name=>ensureModule(name).catch(()=>{}));},120);return;
        }
        if(await loadAppWithToken(existing,true))return;
      }
    } catch (err) {
      setAuthStatus(false,err.message);
      if(!cached)toast('Sistem belum siap. Coba beberapa saat lagi.');
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
      state.moduleReady=Object.create(null);state.modulePromises=Object.create(null);applyAppDataV1360(r.token,{user:r.user,warehouseName:r.warehouseName,version:r.version},false);
      refreshBootstrapLight().then(()=>{setTimeout(()=>{['delivery','purchase'].forEach(name=>ensureModule(name).catch(()=>{}));},60);}).catch(err=>console.warn('[Wills Warehouse] login background bootstrap:',err&&err.message||err));
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
    sheetHtml('Profil',`<p><b>${esc(d.user && d.user.name || '')}</b><br>${esc(roleName(d.user && d.user.role || ''))} · @${esc(d.user && d.user.username || '')}</p><div class="actions"><button class="btn btn-line" id="sheetCancel">Tutup</button><button class="btn btn-primary" id="logoutBtn">Logout</button></div>`,{key:'profile'});
    $('#sheetCancel').onclick = closeSheet;
    $('#logoutBtn').onclick = async () => {
      beginBusy('Logout…');
      try { try { if (state.token) await bridge.call('logoutWarehouse', state.token); } catch (_) {}
        localStorage.removeItem(TOKEN_KEY); clearBootstrapSnapshotV1360(); state.token=''; state.data=null; updateNotificationBadge(); resetSheetNavigation();
        appHistoryReady=false; history.replaceState({willsLogin:true}, document.title);
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
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=1.5.2.16-so-fisik-0811', { updateViaCache: 'none' }).then(reg => reg.update()).catch(() => {}));
  }


  // Scroll tetap native/normal. Pull-to-refresh dicegah lewat CSS overscroll-behavior,
  // bukan dengan membatalkan touchmove sehingga tarikan layar tetap terasa normal.


  boot();
})();