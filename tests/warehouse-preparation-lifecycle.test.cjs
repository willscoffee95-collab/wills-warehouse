'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const addon=fs.readFileSync(path.join(root,'backend-addon/Code_Preparation_V15212.gs'),'utf8');
const bridge=fs.readFileSync(path.join(root,'backend-addon/Bridge_V15212_PREP_VERIFIED.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app.css'),'utf8');
function part(a,b){const i=app.indexOf(a),j=app.indexOf(b,i+a.length);
  assert.ok(i>=0&&j>i,'markers '+a+' / '+b);return app.slice(i,j);}
function sandbox(options={}){
  const props=new Map(),events=[],outgoing=[],ledger=[],writes=[];
  let reviewed=options.reviewed!==false,reviewId='review-1001';
  const linked={requestId:'REQ-RB-1',outletCode:'RB',
    delivery:{sjId:'SJID-RB-1',noSj:'SJ-RB-1',status:'DRAFT'},
    lines:[{lineNo:1,code:'UHT',name:'Susu UHT',sendUnit:'pcs',
      requestedQtyUnit:5,qtyUnit:options.qty===undefined?4:options.qty,
      fulfillmentReason:options.reason===undefined?'stok menipis':options.reason}]};
  const user={name:'Andini',role:'ADMIN'};
  const ctx={
    PropertiesService:{getScriptProperties:()=>({
      getProperty:key=>props.get(key)||null,
      setProperty:(key,val)=>{props.set(key,val);writes.push(key);return null}
    })},
    sha256Hex_:x=>createHash('sha256').update(String(x)).digest('hex'),
    serializeDateTime_:d=>d.toISOString(),Date,String,Number,Math,Array,Object,JSON,
    warehouseSs_:()=>({}),ww1525FindRequestDraft_:(_ss,id)=>{
      if(String(id)!==linked.requestId)throw Error('Unknown request');return linked;
    },
    ww1525ReadReview_:()=>({checked:reviewed,reviewId:reviewed?reviewId:'',reviewedBy:'Andini'}),
    ww1527HasPickingAdjustment_:()=>reviewed,
    roleHasPermission_:()=>true,requireSessionReadOnlyFastV1360_:()=>user,
    requirePermission_:()=>user,assertNoPendingRecovery_:()=>{},
    assertIdem_:id=>{if(!id)throw Error('No idempotency key')},
    withWriteLock_:fn=>fn(),normalizeCode_:x=>String(x).toUpperCase(),
    auditLog_:(...args)=>events.push(args),
    dispatchDelivery:(...args)=>{outgoing.push(args);return {ok:true,deliveryV1354:{sjId:linked.delivery.sjId,status:'DIKIRIM'}}},
    Logger:{log:()=>{}}
  };
  const api=vm.runInNewContext(addon+
    '\n({getWarehousePreparationV15212,verifyWarehousePreparationV15212,dispatchWarehouseVerifiedV15212,ww15212PreparationState_})',
    ctx);
  const payload=()=>({requestId:linked.requestId,sjId:linked.delivery.sjId,reviewId,
      items:linked.lines.map(l=>({lineNo:l.lineNo,code:l.code,
        approvedQtyUnit:String(l.qtyUnit),reason:l.fulfillmentReason}))});
  return {api,props,events,outgoing,ledger,writes,linked,payload,
    setReviewed:b=>{reviewed=b},setRevision:v=>{reviewId=v}};
}

test('backend status starts MENUNGGU_DISIAPKAN then SIAP_CEK_ULANG, without posting any ledger',()=>{
  const s=sandbox({reviewed:false});
  assert.equal(s.api.getWarehousePreparationV15212('token','REQ-RB-1').phase,'MENUNGGU_DISIAPKAN');
  s.setReviewed(true);
  const response=s.api.getWarehousePreparationV15212('token','REQ-RB-1');
  assert.equal(response.phase,'SIAP_CEK_ULANG');
  assert.equal(response.reviewId,'review-1001');
  assert.equal(s.ledger.length,0);
});

test('Cek Ulang persists a small per-SJ verification and keeps immutable audit evidence',()=>{
  const s=sandbox(),result=s.api.verifyWarehousePreparationV15212('token',s.payload(),'idem-1');
  assert.equal(result.ok,true);
  assert.equal(result.verified,true);
  assert.equal(s.writes.length,1,'exactly one keyed state property');
  assert.equal(s.events.length,1,'audit event is recorded');
  const fresh=s.api.getWarehousePreparationV15212('token','REQ-RB-1');
  assert.equal(fresh.phase,'SIAP_KIRIM');
  assert.equal(fresh.verified,true);
  assert.equal(s.ledger.length,0);
});

test('verification is idempotent for same review, but revision invalidates prior approval',()=>{
  const s=sandbox();
  s.api.verifyWarehousePreparationV15212('token',s.payload(),'idem-1');
  const again=s.api.verifyWarehousePreparationV15212('token',s.payload(),'idem-1');
  assert.equal(again.idempotent,true);
  assert.equal(s.events.length,1);
  s.setRevision('review-NEW');
  assert.equal(s.api.getWarehousePreparationV15212('token','REQ-RB-1').phase,'SIAP_CEK_ULANG');
  assert.throws(()=>s.api.dispatchWarehouseVerifiedV15212('token',{...s.payload(),reviewId:'review-NEW'},'dispatch-1'),/belum terverifikasi/);
  assert.equal(s.outgoing.length,0);
});

test('wrong quantities, reasons or missing physical review cannot be verified',()=>{
  const s=sandbox();
  assert.throws(()=>s.api.verifyWarehousePreparationV15212('token',
    {...s.payload(),items:[{lineNo:1,code:'UHT',approvedQtyUnit:'5',reason:'stok menipis'}]},'idem-1'),
    /Jumlah\/alasan/);
  assert.throws(()=>s.api.verifyWarehousePreparationV15212('token',
    {...s.payload(),items:[{lineNo:1,code:'UHT',approvedQtyUnit:'4',reason:'stok tersedia'}]},'idem-2'),
    /Jumlah\/alasan/);
  assert.equal(s.events.length,0);
});

test('all-zero stock may be recorded as missing but must not be dispatched',()=>{
  const s=sandbox({qty:0,reason:'stok kosong'});
  assert.throws(()=>s.api.verifyWarehousePreparationV15212('token',s.payload(),'idem-0'),/Seluruh bahan kosong/);
  assert.equal(s.events.length,0);
  assert.equal(s.outgoing.length,0);
});

test('dispatch is blocked if double-check is absent, then uses the core dispatch method once',()=>{
  const s=sandbox();
  assert.throws(()=>s.api.dispatchWarehouseVerifiedV15212('token',s.payload(),'dispatch-1'),/belum terverifikasi/);
  s.api.verifyWarehousePreparationV15212('token',s.payload(),'verify-1');
  const res=s.api.dispatchWarehouseVerifiedV15212('token',s.payload(),'dispatch-1');
  assert.equal(res.deliveryV1354.status,'DIKIRIM');
  assert.equal(s.outgoing.length,1);
  assert.equal(s.outgoing[0][2],'dispatch-1');
});

test('bridge refuses raw dispatchDelivery and allows only reviewed dispatch entrypoint',()=>{
  assert.match(bridge,/'dispatchWarehouseVerifiedV15212'/);
  assert.match(bridge,/'getWarehousePreparationV15212'/);
  assert.match(bridge,/'verifyWarehousePreparationV15212'/);
  const set=bridge.split('const ALLOWED_METHODS = new Set([')[1].split(']);')[0];
  assert.doesNotMatch(set,/^\s*'dispatchDelivery',/m);
});

test('one fast preparation read is used for first screen, not separate price or full-module queries',()=>{
  const screen=part('  function opsRequestDetailV43(requestId) {','  // Second physical review.');
  assert.match(screen,/wwPrepGetV15212\(id\)\.then/);
  assert.doesNotMatch(screen,/getWarehousePickingPricesV1526/);
  assert.doesNotMatch(screen,/reloadDeliveryModule\(/);
  assert.match(screen,/Selesai Disiapkan/);
  assert.match(screen,/Cek Ulang Bahan/);
  assert.doesNotMatch(screen,/Cetak Thermal/);
  assert.match(screen,/saveWarehouseRequestAvailabilityV1525/);
});

test('quick cache coalesces concurrent loading and serves fresh data within 12 seconds',async()=>{
  let calls=0,now=1000;
  const ctx={Map,Date:{now:()=>now},String,
    bridge:{call:async()=>{calls++;return {ok:true,requestId:'REQ-RB-1',status:'DRAFT',phase:'MENUNGGU_DISIAPKAN'}}},
    state:{token:'token'},Error};
  const api=vm.runInNewContext(
    part('  const wwPrepCacheV15212=new Map();','  // Render only actions authorized by current server-side preparation stage.')+
    '\n({wwPrepGetV15212,wwPrepClearV15212})',ctx);
  const [a,b]=await Promise.all([api.wwPrepGetV15212('REQ-RB-1'),api.wwPrepGetV15212('REQ-RB-1')]);
  assert.equal(calls,1);
  assert.equal(a.phase,b.phase);
  now=11000;
  await api.wwPrepGetV15212('REQ-RB-1');
  assert.equal(calls,1);
  api.wwPrepClearV15212('REQ-RB-1');
  await api.wwPrepGetV15212('REQ-RB-1');
  assert.equal(calls,2);
});

test('server verification is required before a visible Konfirmasi Kirim button exists',()=>{
  const icons={clock:'<svg/>',clipboard:'<svg/>',truck:'<svg/>',warning:'<svg/>'};
  const ui=vm.runInNewContext(
    part('  function wwSjWorkflowMarkupV15212(','  function directDeliveryDetail(id){')+
    '\nwwSjWorkflowMarkupV15212',{String,icons});
  const permissions={canPrepare:true,canCancel:false,canDispatch:true};
  const labels=[
    ['MENUNGGU_DISIAPKAN','Siapkan Bahan'],
    ['SIAP_CEK_ULANG','Cek Ulang'],
    ['SIAP_KIRIM','Konfirmasi Kirim']
  ];
  for(const [stage,label] of labels){
    const markup=ui(stage,permissions,false);
    assert.ok(markup.includes(label));
    assert.equal((markup.match(/<button /g)||[]).length,1);
  }
  assert.doesNotMatch(ui('SIAP_CEK_ULANG',permissions,false),/ghSendSj/);
  assert.doesNotMatch(ui('SIAP_KIRIM',permissions,true),/ghSendSj/);
  assert.match(ui('SIAP_KIRIM',permissions,true),/Cek Status Kirim/);
});

test('frontend print gate rejects DRAFT and thermal becomes available after DIKIRIM',()=>{
  const print=part('  function directPrintDeliveryDraft(id){','  function printRawBt(text){');
  assert.match(print,/if\(!\['DIKIRIM','DITERIMA'/);
  assert.match(print,/Cetak Surat Jalan hanya setelah status Kirim terverifikasi/);
  const send=part('  function directDeliveryDetail(id){','  function findRequestForDelivery(d){');
  assert.match(send,/dispatchWarehouseVerifiedV15212/);
  assert.match(send,/getWarehousePreparationV15212|wwPrepGetV15212/);
});

test('app and SW asset versions aligned for low-staleness PWA updates',()=>{
  const v='1.5.2.12-preparation';
  assert.match(css,/\.ww-prep-stage/);
  assert.match(css,/\.ww-prep-confirm/);
  assert.ok(index.includes('app.js?v='+v));
  assert.ok(index.includes('app.css?v='+v));
  assert.ok(sw.includes('app.js?v='+v));
  assert.ok(sw.includes('app.css?v='+v));
  assert.ok(sw.includes('wills-warehouse-shell-v'+v));
  assert.ok(app.includes("serviceWorker.register('./sw.js?v="+v+"'"));
});
