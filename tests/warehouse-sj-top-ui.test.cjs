'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function part(a,b){
  const start=app.indexOf(a),end=app.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,'Expected source markers: '+a);
  return app.slice(start,end);
}
const logic=part('  function wwRecentSjForOutletV15210(','  function directDraftPrintList(){');
const normalize=x=>String(x.outletCode||x.code||'').toUpperCase()==='TGM'?'TM':String(x.outletCode||x.code||'').toUpperCase();
const entries=[
  {sjId:'SJID-1',noSj:'SJ-20261106-0001',outletCode:'TGM',outletName:'Tegal Munjul',status:'DRAFT',createdAt:'2026-11-06T07:00:00',lines:[{code:'B01'}]},
  {sjId:'SJID-2',noSj:'SJ-20261106-0002',outletCode:'RB',outletName:'Pasar Rebo',status:'DRAFT',createdAt:'2026-11-06T08:00:00',lines:[{code:'B01'}]},
  {sjId:'SJID-3',noSj:'SJ-20261106-0003',outletCode:'TM',outletName:'Tegal Munjul',status:'SELESAI',createdAt:'2026-11-06T08:20:00',lines:[{code:'B04'}]},
  {sjId:'SJID-4',noSj:'SJ-20261106-0004',outletCode:'CPS',outletName:'Cipaisan',status:'DIKIRIM',createdAt:'2026-11-06T08:30:00',lines:[{code:'B02'}]}
];

test('SJ helper groups TGM and TM, excludes other outlets',()=>{
  const fn=vm.runInNewContext(
    part('  function wwRecentSjForOutletV15210(','  function directDelivery(load=true){')+'\nwwRecentSjForOutletV15210',
    {wwRequestOutletV1522:normalize,Date,String,Number,Array}
  );
  const result=fn(entries,'TM');
  assert.deepEqual(Array.from(result,x=>x.sjId),['SJID-1','SJID-3']);
  assert.equal(entries.length,4,'helper does not mutate source list');
});

test('draft SJ appears before shipped/completed, and latest within status',()=>{
  const fn=vm.runInNewContext(
    part('  function wwRecentSjForOutletV15210(','  function directDelivery(load=true){')+'\nwwRecentSjForOutletV15210',
    {wwRequestOutletV1522:normalize,Date,String,Number,Array}
  );
  assert.deepEqual(Array.from(fn(entries,'ALL'),x=>x.sjId),['SJID-2','SJID-1','SJID-4','SJID-3']);
});

test('dashboard top area is real SJ list and filtered by selected outlet',()=>{
  const output={html:''};
  const ctx={
    state:{data:{outlets:[{code:'RB',name:'Pasar Rebo',active:'YA'},{code:'TGM',name:'Tegal Munjul',active:'YA'},{code:'CPS',name:'Cipaisan',active:'YA'}],
      deliveries:entries,incomingRequests:[]}},
    wwQueueV1526:{rows:[]},wwQueueErrorV1526:'',wwQueueFetchedAtV1526:Date.now(),
    wwQueuePromiseV1526:null,wwSelectedOutletV1522:'TM',
    wwRequestOutletV1522:normalize,wwDraftSjCountV15211:rows=>(rows||[]).filter(x=>String(x.status||'').toUpperCase()==='DRAFT').length,
    wwVisibleQueueV1528:()=>[],roleCan:()=>false,canAny:()=>false,
    dispatchPendingV44:()=>null,wwRequestProgressCardV1526:()=>'',deliveryStatusBadge:s=>'<b>'+s+'</b>',
    esc:s=>String(s||''),num:x=>String(x),displayDateShort:s=>String(s||'').slice(0,10),
    sheetHtml:(_title,html)=>{output.html=html},
    $:()=>null,$$:()=>[],Date,Number,String,Object,Array,Set,Map,Boolean
  };
  vm.runInNewContext(logic+'\ndirectDelivery(false)',ctx);
  assert.ok(output.html.indexOf('Surat Jalan Terbaru')>=0);
  assert.ok(output.html.includes('data-ww-request-outlet="TM"'));
  assert.ok(output.html.includes('data-sjid="SJID-1"'));
  assert.ok(output.html.includes('data-sjid="SJID-3"'));
  assert.ok(!output.html.includes('data-sjid="SJID-2"'),'RB is not shown when TM selected');
  assert.ok(!output.html.includes('data-sjid="SJID-4"'),'CPS is not shown when TM selected');
  assert.ok(!output.html.includes('<summary>Surat Jalan Terbaru'),'SJ no longer hidden in bottom collapsed section');
});

test('SJ detail renders and rebinds actions in place using the existing guarded dispatch',()=>{
  const detail=part('  function directDeliveryDetail(id){','  function findRequestForDelivery(d){');
  const bindings=part('  function wwSjBindActionsV15213(id,d,req){','  function directDeliveryDetail(id){');
  const actions=part('  function wwSjActionMarkupV15211(','  async function wwSjWithLoadingV15211(');
  assert.match(actions,/ghPrintSj/);
  assert.match(actions,/wwSjCheckMaterialsV15210/);
  assert.match(actions,/ghCancelSj/);
  assert.match(actions,/ghSendSj/);
  assert.match(actions,/permissions.canDispatch/);
  assert.match(detail,/wwSjBindActionsV15213\(id,d,req\)/);
  assert.match(detail,/data-ww-sj-live-actions/);
  assert.match(bindings,/inspect\.onclick=\(\)=>opsRequestDetailV43\(req\.requestId\)/);
  assert.match(bindings,/writeDeliveryDirect\('dispatch_'\+id,'dispatchDelivery'/);
  assert.match(bindings,/wwSjWithLoadingV15211\(k,/);
});
test('saved picking can navigate directly to SJ confirm without re-posting stock',()=>{
  const pick=part('  function opsRequestDetailV43(requestId) {','  function opsPrintRequestThermalV43(');
  assert.match(pick,/id="wwPickingGoDeliveryV15210" disabled/);
  assert.match(pick,/goDelivery\.onclick=returnToSjV15210/);
  assert.match(pick,/goDelivery\.disabled=true;/);
  assert.match(pick,/if\(report\.checked\)\{/);
  assert.match(pick,/goDelivery\.disabled=!/);
  assert.match(pick,/directDeliveryDetail\(sj\.sjId\)/);
  assert.doesNotMatch(pick,/goDelivery\.onclick=.*dispatchDelivery/);
});

test('canonical queue and module request lookup preserve linked SJ identity',()=>{
  const fn=vm.runInNewContext(part('  function findRequestForDelivery(d){','  function wrapThermal(')+
    '\nfindRequestForDelivery',
    {wwQueueV1526:{rows:[{requestId:'REQ-TGM',sjId:'SJID-1',noSj:'SJ-20261106-0001'}]},
      state:{data:{incomingRequests:[]}},String,Array}
  );
  const matched=fn(entries[0]);
  assert.equal(matched.requestId,'REQ-TGM');
  assert.equal(fn({sjId:'SJID-OTHER',noSj:'NONSENSE'}),null);
});

test('cache-busting version is consistent in app, index and service worker',()=>{
  const ver='1.5.2.14-fast-ack';
  assert.ok(index.includes('app.js?v='+ver));
  assert.ok(sw.includes('app.js?v='+ver));
  assert.ok(sw.includes('wills-warehouse-shell-v'+ver));
  assert.ok(app.includes("serviceWorker.register('./sw.js?v="+ver+"'"));
  assert.ok(app.includes("WW_FRONTEND_BUILD='2026-11-07."+ver+"'"));
});
