'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

function part(a,b){
  const start=app.indexOf(a),end=app.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,'Source boundaries '+a+' and '+b);
  return app.slice(start,end);
}

function mountedDetail({status='DRAFT',pending=false,active=false}={}){
  const elements={
    status:{innerHTML:'<span>DRAFT</span>'},
    note:{innerHTML:'',querySelector(selector){
      if(selector!=='[data-ww-sj-stage-v15215]')return null;
      const match=this.innerHTML.match(/data-ww-sj-stage-v15215="([^"]+)"/);
      return match?{getAttribute:()=>match[1]}:null;
    }},
    actions:{innerHTML:'<button id="ghSendSj">Konfirmasi Kirim</button>',dataset:{wwSjKey:'DRAFT|false|true'}},
    items:{innerHTML:''}
  };
  const selector={
    '[data-ww-sj-live-status]':elements.status,
    '[data-ww-sj-live-note]':elements.note,
    '[data-ww-sj-live-actions]':elements.actions,
    '[data-ww-sj-live-lines]':elements.items
  };
  const sheet={
    dataset:{sheetKey:'delivery-detail:SJID-1'},
    querySelector:key=>selector[key]||null
  };
  const rootNode={firstElementChild:sheet};
  const data={deliveries:[{sjId:'SJID-1',noSj:'SJ-1',status,lines:[
    {name:'UHT',code:'B01',requestedQtyUnit:5,qtyUnit:4,sendUnit:'pcs',fulfillmentStatus:'DIPENUHI SEBAGIAN',fulfillmentReason:'stok menipis'}
  ]}]};
  const inFlight=new Set(active?['dispatch_SJID-1']:[]);
  const records={rebuilds:0,binds:0,reloads:0,checks:0};
  const ctx={
    state:{data},opsWriteInFlightV43:inFlight,
    currentSheetKey:()=>sheet.dataset.sheetKey,
    $:q=>q==='#sheetRoot'?rootNode:null,
    dispatchPendingV44:()=>pending?{sjId:'SJID-1'}:null,
    wwSjActionMarkupV15211:(d,req,_roles,isPending)=>
      d.status==='DIKIRIM'?'<button id="ghPrintSj">Cetak Thermal · SIAP KIRIM</button>':
      isPending?'<button id="ghCheckSjStatus">Cek Status Kirim</button>':
      '<button id="ghSendSj">Konfirmasi Kirim</button>',
    wwSjBindActionsV15213:()=>records.binds++,
    findRequestForDelivery:()=>({requestId:'REQ-1'}),
    roleCan:()=>true,actionAllowed:()=>true,
    deliveryStatusBadge:x=>'<span class="badge">'+x+'</span>',
    wwDraftSjCountV15211:()=>0,wwSelectedOutletV1522:'ALL',
    esc:x=>String(x||''),num:x=>String(x),
    sheetHtml:()=>records.rebuilds++,
    reloadDeliveryModule:()=>{records.reloads++;return Promise.resolve()},
    String,Array,Number,Boolean,Set,Object,Map
  };
  const api=vm.runInNewContext(
    part('  function wwSjDispatchNoteV15213(id,d){','  function dispatchApplyStatusV44(id,fresh){')+
    '\n({dispatchUpdateIfVisibleV44,wwSjUpdateDetailV15213,wwSjDispatchNoteV15213})',ctx);
  return {api,records,data,elements,rootNode,sheet,inFlight,ctx};
}

test('DRAFT to DIKIRIM updates existing sheet badge and action without opening a new sheet',()=>{
  const h=mountedDetail();
  const before=h.rootNode.firstElementChild;
  h.data.deliveries[0].status='DIKIRIM';
  h.data.deliveries[0].dispatchTxnId='DSP-1';
  h.api.dispatchUpdateIfVisibleV44('SJID-1');
  assert.strictEqual(h.rootNode.firstElementChild,before,'same sheet object remains mounted');
  assert.match(h.elements.status.innerHTML,/DIKIRIM/);
  assert.match(h.elements.note.innerHTML,/Berhasil dikirim — silakan Cetak SJ/);
  assert.match(h.elements.actions.innerHTML,/Cetak Thermal · SIAP KIRIM/);
  assert.equal(h.records.binds,1);
  assert.equal(h.records.rebuilds,0);
  assert.equal(h.records.reloads,0);
  assert.match(h.elements.items.innerHTML,/stok menipis/);
});

test('while dispatch is working, existing button spinner is not replaced',()=>{
  const h=mountedDetail({active:true,pending:true});
  const before=h.elements.actions.innerHTML;
  h.api.dispatchUpdateIfVisibleV44('SJID-1');
  assert.equal(h.elements.actions.innerHTML,before);
  assert.equal(h.records.binds,0);
  assert.match(h.elements.note.innerHTML,/ww-spin-v1526/);
  assert.match(h.elements.note.innerHTML,/Sedang memproses pengiriman/);
  h.inFlight.delete('dispatch_SJID-1');
  h.api.dispatchUpdateIfVisibleV44('SJID-1');
  assert.match(h.elements.actions.innerHTML,/Cek Status Kirim/);
  assert.equal(h.records.binds,1);
});

test('repeated confirmed status does not rebuild buttons or sheet',()=>{
  const h=mountedDetail();
  h.data.deliveries[0].status='DIKIRIM';
  h.api.dispatchUpdateIfVisibleV44('SJID-1');
  h.api.dispatchUpdateIfVisibleV44('SJID-1');
  assert.equal(h.records.binds,1);
  assert.equal(h.records.rebuilds,0);
});

test('confirmed fresh status is retained with existing delivery lines for printing',()=>{
  const state={data:{deliveries:[
    {sjId:'SJID-1',noSj:'SJ-1',status:'DRAFT',lines:[{code:'UHT',qtyUnit:4}]}
  ]}};
  const fn=vm.runInNewContext(part('  function upsertFreshDeliveryV1354(d){',
    '  // v4.4: persistent uncertainty guard:')+'\nupsertFreshDeliveryV1354',{state,Array,String});
  fn({sjId:'SJID-1',noSj:'SJ-1',status:'DIKIRIM'});
  assert.equal(state.data.deliveries[0].status,'DIKIRIM');
  assert.equal(state.data.deliveries[0].lines.length,1);
  assert.equal(state.data.deliveries[0].lines[0].qtyUnit,4);
});

test('status change callback never rebuilds entire delivery detail or list',()=>{
  const callback=part('  function dispatchUpdateIfVisibleV44(id){',
    '  function dispatchApplyStatusV44(id,fresh){');
  assert.doesNotMatch(callback,/directDeliveryDetail\(id\)|directDelivery\(\)/);
  assert.match(callback,/wwSjUpdateDetailV15213\(id\)/);
  assert.match(callback,/wwSjUpdateListV15213\(id\)/);
});

test('confirmed dispatch and status check do not start a second full module refresh',()=>{
  const accept=part('  function dispatchAcceptResponseV44(id,response){',
    '  async function writeDeliveryDirect(action,method,payload,sjId){');
  const check=part('  async function dispatchCheckStatusV44(id){',
    '  function dispatchAcceptResponseV44(id,response){');
  assert.doesNotMatch(accept,/reloadDeliveryModule\(/);
  assert.doesNotMatch(check,/reloadDeliveryModule\(/);
  const transaction=part('  async function writeDeliveryDirect(action,method,payload,sjId){',
    '  async function callDirect(method,...args)');
  assert.match(transaction,/dispatchStorePendingV44\(sjId,idem\)/);
  assert.match(transaction,/dispatchUpdateIfVisibleV44\(sjId\)/);
  assert.match(transaction,/Promise\.race/);
});

test('the detail template has stable live-update slots and reuses action handlers',()=>{
  const detail=part('  function directDeliveryDetail(id){','  function findRequestForDelivery(d){');
  for(const slot of ['data-ww-sj-live-status','data-ww-sj-live-note',
                     'data-ww-sj-live-actions','data-ww-sj-live-lines'])
    assert.ok(detail.includes(slot));
  assert.match(detail,/wwSjBindActionsV15213\(id,d,req\)/);
  assert.match(app,/function wwSjBindActionsV15213\(id,d,req\)/);
  assert.match(app,/button\('ghSendSj'/);
});

test('version bump covers JS, CSS and installed PWA shell',()=>{
  const v='1.5.2.17-so-fisik-revisi';
  assert.ok(index.includes('app.js?v='+v));
  assert.ok(index.includes('app.css?v='+v));
  assert.ok(sw.includes('app.js?v='+v));
  assert.ok(sw.includes('app.css?v='+v));
  assert.ok(sw.includes('wills-warehouse-shell-v'+v));
  assert.ok(app.includes("serviceWorker.register('./sw.js?v="+v+"'"));
  assert.ok(css.includes('.ww-sj-inline-status-v15213'));
});
