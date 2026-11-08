'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
function segment(a,b){
 const begin=app.indexOf(a),end=app.indexOf(b,begin+a.length);
 assert.ok(begin>=0&&end>begin,'source segment missing '+a);
 return app.slice(begin,end);
}
const watcherCode=segment('  // v1.5.2.14: canonical read-only verifier.',
                          '  function dispatchUpdateIfVisibleV44(id){');
const sjId='SJID-CKO-1';
function setupWatch(results){
  const jobs=[],state={calls:[],pending:true,status:'DRAFT',posted:false,toasts:[],noteUpdates:0};
  const ctx={
    Map,Set,String,Array,Date,console,
    state:{token:'token'},
    setTimeout(fn,ms){const job={fn,ms,cleared:false};jobs.push(job);return job},
    clearTimeout(job){if(job)job.cleared=true},
    dispatchPendingV44:()=>state.pending?{sjId,idem:'dispatch-1'}:null,
    dispatchUpdateIfVisibleV44:()=>{state.noteUpdates++},
    dispatchApplyStatusV44:(id,fresh)=>{
      state.pending=false;state.posted=true;state.status=fresh.status;
      api.wwDispatchStopWatchV15214(id);return true;
    },
    toast:(message)=>state.toasts.push(message),
    bridge:{call:async(method,token,id)=>{
      state.calls.push({method,token,id});
      const result=results.shift();
      if(result instanceof Error)throw result;
      return result||{sjId,status:'DRAFT'};
    }}
  };
  const api=vm.runInNewContext(watcherCode+
    '\n({wwDispatchConfirmedV15214,wwDispatchStartWatchV15214,wwDispatchStopWatchV15214,wwDispatchWatchersV15214,wwDispatchWatchConfirmedV15214})',ctx);
  const tick=async()=>{
    const job=jobs.find(x=>!x.cleared&&!x.ran);
    assert.ok(job,'no pending timer');
    job.ran=true;
    await job.fn();
    await Promise.resolve();
    return job.ms;
  };
  return {api,ctx,state,jobs,tick};
}

test('early status only accepts canonical posted SJ with matching dispatch txn',()=>{
  const s=setupWatch([]);
  const fn=s.api.wwDispatchConfirmedV15214;
  assert.equal(fn(sjId,{sjId,status:'DRAFT',dispatchTxnId:'DSP-1'}),false);
  assert.equal(fn(sjId,{sjId,status:'DIKIRIM'}),false);
  assert.equal(fn(sjId,{sjId:'other',status:'DIKIRIM',dispatchTxnId:'DSP-1'}),false);
  assert.equal(fn(sjId,{sjId,status:'DIKIRIM',dispatchTxnId:'DSP-1'}),true);
  assert.equal(fn(sjId,{sjId,status:'SELESAI',dispatchTxnId:'DSP-1'}),true);
});

test('slow feed: only read status and unlock print when txn becomes DIKIRIM',async()=>{
  const s=setupWatch([
    {sjId,status:'DRAFT'},
    {sjId,status:'DIKIRIM',dispatchTxnId:'DSP-CKO-20261107',noSj:'SJ-CKO'}
  ]);
  s.api.wwDispatchStartWatchV15214(sjId);
  assert.equal(s.jobs[0].ms,3500);
  assert.equal(await s.tick(),3500);
  assert.equal(s.state.pending,true);
  assert.equal(await s.tick(),6500);
  assert.equal(s.state.status,'DIKIRIM');
  assert.equal(s.state.pending,false);
  assert.equal(s.state.calls.length,2);
  assert.ok(s.state.calls.every(x=>x.method==='getDeliveryDetailFreshV1354'));
  assert.equal(s.api.wwDispatchWatchersV15214.size,0);
  assert.equal(s.api.wwDispatchWatchConfirmedV15214.has(sjId),true);
  assert.equal(s.state.toasts.length,1);
});

test('watch never resends and leaves pending intact after repeated DRAFT/errors',async()=>{
  const s=setupWatch([new Error('temporarily busy'),...Array(9).fill({sjId,status:'DRAFT'})]);
  s.api.wwDispatchStartWatchV15214(sjId);
  for(let i=0;i<6;i++)await s.tick();
  assert.equal(s.state.posted,false);
  assert.equal(s.state.pending,true);
  assert.equal(s.api.wwDispatchWatchersV15214.size,0);
  assert.equal(s.state.calls.length,6);
  assert.ok(s.state.calls.every(x=>x.method==='getDeliveryDetailFreshV1354'));
  assert.equal(s.state.toasts.length,0);
  assert.ok(!s.jobs.some(x=>!x.ran&&!x.cleared));
});

test('second watch call cannot schedule duplicate status polling',async()=>{
  const s=setupWatch([{sjId,status:'DIKIRIM',dispatchTxnId:'DSP-1'}]);
  s.api.wwDispatchStartWatchV15214(sjId);
  s.api.wwDispatchStartWatchV15214(sjId);
  assert.equal(s.jobs.length,1);
  await s.tick();
  assert.equal(s.state.calls.length,1);
});

test('pending lock cannot be bypassed if localStorage fails to persist',()=>{
  const code=segment('  function dispatchStorePendingV44(id,idem){',
                     '  function dispatchClearPendingV44(id){');
  const good=new Map();
  function run(store){
    const fn=vm.runInNewContext(code+'\ndispatchStorePendingV44',{
      dispatchPendingKeyV44:id=>'k_'+id,localStorage:store,
      JSON,String,Date});
    return fn(sjId,'idem-1');
  }
  const goodStore={setItem:(k,v)=>good.set(k,v),getItem:k=>good.get(k)};
  assert.equal(run(goodStore),true);
  assert.equal(run({setItem:()=>{},getItem:()=>null}),false);
  assert.equal(run({setItem:()=>{throw Error('QuotaExceeded')},getItem:()=>null}),false);
  const writer=segment('  async function writeDeliveryDirect(action,method,payload,sjId){',
                       '  async function callDirect(method');
  assert.match(writer,/if\(dispatch&&!dispatchStorePendingV44\(sjId,idem\)\)/);
  assert.match(writer,/return \{ok:false,blocked:true\}/);
});

test('late DRAFT from other read does not downgrade the confirmed DIKIRIM snapshot',()=>{
  const code=segment('  function upsertFreshDeliveryV1354(d){',
                     '  // v4.4: persistent uncertainty guard:');
  const state={data:{deliveries:[{sjId,status:'DIKIRIM',dispatchTxnId:'DSP-1',lines:[{qtyUnit:4}]}]}};
  const fn=vm.runInNewContext(code+'\nupsertFreshDeliveryV1354',{state,Array,String});
  fn({sjId,status:'DRAFT'});
  assert.equal(state.data.deliveries[0].status,'DIKIRIM');
  assert.equal(state.data.deliveries[0].dispatchTxnId,'DSP-1');
  fn({sjId,status:'DIKIRIM',dispatchTxnId:'DSP-1'});
  assert.equal(state.data.deliveries[0].lines[0].qtyUnit,4);
});

test('existing guard prevents a second dispatch while the status is unknown',()=>{
  const code=segment('  async function writeDeliveryDirect(action,method,payload,sjId){',
                     '  async function callDirect(method');
  assert.match(code,/if\(dispatch&&dispatchPendingV44\(sjId\)\)/);
  assert.match(code,/wwDispatchStartWatchV15214\(sjId\)/);
  assert.match(code,/Promise\.race/);
  assert.match(code,/new Promise\(resolve=>\{timer=setTimeout\(\(\)=>resolve\(\{type:'slow'\}\),25000\)/);
  assert.doesNotMatch(watcherCode,/bridge\.call\('dispatchDelivery'/);
});

test('PWA version uses new fast acknowledgment script in index and service worker',()=>{
  const version='1.5.2.17-so-fisik-revisi';
  assert.match(app,/wwDispatchStartWatchV15214/);
  assert.ok(index.includes('app.js?v='+version));
  assert.ok(sw.includes('app.js?v='+version));
  assert.ok(sw.includes('wills-warehouse-shell-v'+version));
  assert.ok(app.includes("serviceWorker.register('./sw.js?v="+version+"'"));
});
