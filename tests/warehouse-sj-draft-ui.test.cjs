'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'app.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function part(a,b){
  const start=app.indexOf(a),end=app.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,'Missing source: '+a);
  return app.slice(start,end);
}
const normalize=x=>{
  const code=String((x||{}).outletCode||(x||{}).code||'').toUpperCase();
  return code==='TGM'?'TM':code;
};
const items=[
 {sjId:'1',noSj:'SJ-1',status:'DRAFT',outletCode:'RB',outletName:'Pasar Rebo',lines:[{code:'UHT'}]},
 {sjId:'2',noSj:'SJ-2',status:'DIKIRIM',outletCode:'RB',outletName:'Pasar Rebo',lines:[]},
 {sjId:'3',noSj:'SJ-3',status:'SELESAI',outletCode:'RB',outletName:'Pasar Rebo',lines:[]},
 {sjId:'4',noSj:'SJ-4',status:'DRAFT',outletCode:'TGM',outletName:'Tegal Munjul',lines:[]},
 {sjId:'5',noSj:'SJ-5',status:'DIBATALKAN',outletCode:'TM',outletName:'Tegal Munjul',lines:[]},
 {sjId:'6',noSj:'SJ-6',status:'DITERIMA',outletCode:'CPS',outletName:'Cipaisan',lines:[]},
 {sjId:'7',noSj:'SJ-7',status:'SELISIH',outletCode:'CPK',outletName:'Cikopak',lines:[]}
];

function draftCounter(){
 const logic=part('  function wwDraftSjCountV15211(','  function wwRecentSjForOutletV15210(');
 return vm.runInNewContext(logic+'\nwwDraftSjCountV15211',{wwRequestOutletV1522:normalize,String,Array});
}
const actions=vm.runInNewContext(
  part('  function wwSjActionMarkupV15211(','  async function wwSjWithLoadingV15211(')+'\nwwSjActionMarkupV15211',
  {icons:{printer:'<svg></svg>',clipboard:'<svg></svg>',warning:'<svg></svg>',truck:'<svg></svg>',clock:'<svg></svg>'},String,Array}
);
const workflow=vm.runInNewContext(
  part('  function wwSjWorkflowMarkupV15212(','  function directDeliveryDetail(id){')+'\nwwSjWorkflowMarkupV15212',
  {icons:{printer:'<svg></svg>',clipboard:'<svg></svg>',warning:'<svg></svg>',truck:'<svg></svg>',clock:'<svg></svg>'},
   String,Array}
);
const owner={canPrint:true,canPrepare:true,canCancel:true,canDispatch:true};
const admin={canPrint:true,canPrepare:true,canCancel:false,canDispatch:true};

test('only DRAFT counts in all-outlet and per-outlet SJ badges',()=>{
  const count=draftCounter();
  assert.equal(count(items),2);
  assert.equal(count(items,'RB'),1);
  assert.equal(count(items,'TM'),1);
  assert.equal(count(items,'CPS'),0);
  assert.equal(count(items,'CPK'),0);
  assert.equal(count(items.concat({sjId:'8',noSj:'SJ-8',outletCode:'UPI',status:'draft'})),3);
});

test('visible latest SJ list remains available for printing after dispatch',()=>{
  const code=part('  function wwRecentSjForOutletV15210(','  function directDelivery(load=true){');
  const fn=vm.runInNewContext(code+'\nwwRecentSjForOutletV15210',{wwRequestOutletV1522:normalize,Date,String,Number,Array});
  assert.deepEqual(Array.from(fn(items,'RB'),x=>x.status),['DRAFT','DIKIRIM','SELESAI']);
});

test('DRAFT fallback renders no print/send; one step at a time is shown from backend stage',()=>{
  assert.equal((actions(items[0],{requestId:'REQ-1'},owner,false).match(/<button /g)||[]).length,0);
  const stages=[
    ['MENUNGGU_DISIAPKAN','Siapkan Bahan'],
    ['SIAP_CEK_ULANG','Cek Ulang'],
    ['SIAP_KIRIM','Konfirmasi Kirim']
  ];
  for(const [phase,action] of stages){
    const view=workflow(phase,owner,false);
    assert.ok(view.includes(action));
    assert.equal((view.match(/<button /g)||[]).length,2);
    assert.ok(view.includes('ghCancelSj'));
    assert.ok(!view.includes('ghPrintSj'),'no pre-dispatch printing');
  }
});

test('staff permissions and unresolved dispatch hide unsafe controls',()=>{
  const adminMarkup=workflow('SIAP_KIRIM',admin,false);
  assert.ok(!adminMarkup.includes('ghCancelSj'));
  assert.ok(adminMarkup.includes('ghSendSj'));
  const pending=workflow('SIAP_KIRIM',owner,true);
  assert.ok(pending.includes('ghCheckSjStatus'));
  assert.ok(!pending.includes('ghSendSj'));
  assert.ok(!pending.includes('ghCancelSj'));
});

test('after confirmed DIKIRIM status, action changes to one SIAP KIRIM thermal print',()=>{
  const shipped=actions(items[1],{requestId:'REQ-1'},owner,false);
  assert.match(shipped,/Cetak Thermal · SIAP KIRIM/);
  assert.match(shipped,/id="ghPrintSj"/);
  assert.equal((shipped.match(/<button /g)||[]).length,1);
  for(const name of ['ghCancelSj','ghSendSj','wwSjCheckMaterialsV15210'])
    assert.ok(!shipped.includes(name));
  assert.ok(!actions(items[4],null,owner,false).includes('ghPrintSj'),'canceled SJ cannot print as ready');
});

test('roles without prepare and dispatch permissions never receive action buttons',()=>{
  const m=workflow('SIAP_CEK_ULANG',{canPrepare:false,canCancel:false,canDispatch:false},false);
  assert.equal((m.match(/<button /g)||[]).length,0);
  assert.ok(!m.includes('ghSendSj'));
  assert.ok(!m.includes('wwSjReviewV15212'));
});

test('while async Send is running, clicked button is disabled and visibly spinning',async()=>{
  let finish;
  const running=new Promise(resolve=>{finish=resolve});
  const button={
    disabled:false,isConnected:true,attributes:new Map(),classes:new Set(),
    classList:{},setAttribute(name,value){this.attributes.set(name,value)},
    removeAttribute(name){this.attributes.delete(name)}
  };
  button.classList.add=name=>button.classes.add(name);
  button.classList.remove=name=>button.classes.delete(name);
  const wrapper=vm.runInNewContext(
    part('  async function wwSjWithLoadingV15211(','  function directDeliveryDetail(id){')+'\nwwSjWithLoadingV15211',
    {String,Promise}
  );
  let calls=0;
  const first=wrapper(button,()=>{calls++;return running});
  const duplicate=await wrapper(button,()=>{calls++;return Promise.resolve('wrong')});
  assert.equal(duplicate,null);
  assert.equal(button.disabled,true);
  assert.ok(button.classes.has('is-loading'));
  assert.equal(button.attributes.get('aria-busy'),'true');
  assert.equal(calls,1);
  finish({ok:true});
  await first;
  assert.equal(button.disabled,false);
  assert.ok(!button.classes.has('is-loading'));
  assert.equal(button.attributes.has('aria-busy'),false);
});

test('spinner and button state also restore on rejected backend call',async()=>{
  const button={disabled:false,isConnected:true,classes:new Set(),attrs:new Map()};
  button.classList={add:x=>button.classes.add(x),remove:x=>button.classes.delete(x)};
  button.setAttribute=(a,b)=>button.attrs.set(a,b);
  button.removeAttribute=a=>button.attrs.delete(a);
  const wrapper=vm.runInNewContext(
    part('  async function wwSjWithLoadingV15211(','  function directDeliveryDetail(id){')+'\nwwSjWithLoadingV15211',
    {Promise}
  );
  await assert.rejects(wrapper(button,()=>Promise.reject(Error('timeout'))),/timeout/);
  assert.equal(button.disabled,false);
  assert.ok(!button.classes.has('is-loading'));
});

test('thermal header is DRAFT before dispatch and SIAP KIRIM only on DIKIRIM',()=>{
  const fn=vm.runInNewContext(
    part('  function wrapThermal(','  function directPrintDeliveryDraft(id){')+'\ndeliveryThermalText',
    {findRequestForDelivery:()=>null,state:{data:{user:{name:'Admin',role:'ADMIN_2'}}},
     roleName:x=>x,displayDateShort:x=>String(x||''),num:x=>String(x),
     Date,Intl,String,Number,Array,Math}
  );
  const sample={noSj:'SJ-100',outletName:'Pasar Rebo',lines:[]};
  const draft=fn({...sample,status:'DRAFT'},32);
  const sent=fn({...sample,status:'DIKIRIM'},32);
  assert.ok(draft.includes('DRAFT - CEK GUDANG'));
  assert.ok(!draft.includes('Status SJ: DIKIRIM'));
  assert.ok(sent.includes('SIAP KIRIM'));
  assert.ok(sent.includes('Status SJ: DIKIRIM'));
});

test('notification SJ content and KPI derive from DRAFT status, not PREPARE count',()=>{
  const notices=part('  function notificationCount() {','  function updateNotificationBadge()');
  const counter=vm.runInNewContext(
    part('  function wwDraftSjCountV15211(','  function wwRecentSjForOutletV15210(')+
    notices+'\nnotificationCount',
    {state:{data:{dashboard:{recoveryPending:0},deliveries:items}},
     stockAlerts:()=>[],inventoryOnlyV1520:()=>true,wwRequestOutletV1522:normalize,
     String,Array,Number}
  );
  assert.equal(counter(),1,'global notice includes one SJ DRAFT category, not seven SJ');
  assert.match(app,/if\(req.length\) other.push\(`<div class="notice-row">[\s\S]*?Surat Jalan DRAFT/);
  assert.match(app,/kpiCard\('Harus Dikirim',qty\(openReq\),'SJ DRAFT menunggu pengiriman'\)/);
});

test('candidate CSS, app, index and service worker are version-aligned',()=>{
  const version='1.5.2.12-preparation';
  assert.ok(html.includes('app.js?v='+version));
  assert.ok(html.includes('app.css?v='+version));
  assert.ok(sw.includes('app.js?v='+version));
  assert.ok(sw.includes('app.css?v='+version));
  assert.ok(sw.includes('wills-warehouse-shell-v'+version));
  assert.ok(app.includes("serviceWorker.register('./sw.js?v="+version+"'"));
  assert.ok(css.includes('.ww-sj-action-panel'));
  assert.ok(css.includes('.ww-sj-action.is-loading::after'));
});

test('dispatch uses the verified backend method and thermal has no stock posting',()=>{
  const detail=part('  function directDeliveryDetail(id){','  function findRequestForDelivery(d){');
  assert.match(detail,/dispatchWarehouseVerifiedV15212/);
  assert.match(detail,/wwPrepGetV15212\(req\.requestId\)/);
  assert.match(detail,/confirm\('Persiapan dan Cek Ulang telah selesai/);
  const thermal=part('  function directPrintDeliveryDraft(id){','  function printRawBt(text){');
  assert.doesNotMatch(thermal,/dispatchDelivery|dispatchWarehouseVerifiedV15212/);
});
