'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
function part(startText,endText){
  const start=source.indexOf(startText),end=source.indexOf(endText,start+startText.length);
  assert.ok(start>=0&&end>start,'Expected source markers are intact: '+startText);
  return source.slice(start,end);
}
const helperSource=part('  function requireConfirmedWarehouseWriteV160(','  const opsWriteInFlightV43=');
const normalWriteSource=part('  const opsWriteInFlightV43=','  async function reloadDeliveryModule()');
const validate=vm.runInNewContext(helperSource+'\nrequireConfirmedWarehouseWriteV160');

test('explicit server success allows write acknowledgement',()=>{
  assert.equal(validate({ok:true,txnId:'PUR-1'},'Purchase').txnId,'PUR-1');
  assert.equal(validate({ok:true,status:'POSTED',txnId:'DSP-1'},'SJ').txnId,'DSP-1');
  assert.equal(validate({status:'POSTED',txnId:'DSP-2'},'SJ').txnId,'DSP-2');
});
test('empty/null/opaque success responses are unverified, never succeeded',()=>{
  for(const v of [null,undefined,'success',42,[],{}, {status:'OK'}, {ok:1}]){
    assert.throws(()=>validate(v,'Purchase'),/belum|dapat dipastikan/);
  }
});
test('pending POSTING state and pendingRecovery are blocked',()=>{
  for(const v of [{ok:false,status:'POSTING',pendingRecovery:true},
    {ok:true,status:'POSTING'},{ok:true,status:'PENDING_RECOVERY'},
    {ok:true,pendingRecovery:true},{ok:true,status:'RECOVERY_PENDING'}]){
    assert.throws(()=>validate(v,'Purchase'),/recovery|belum/);
  }
});
test('idempotent reversed transaction cannot be falsely called a success',()=>{
  assert.throws(()=>validate({ok:true, status:'REVERSED',idempotent:true,txnId:'REV-1'},'Purchase'),/direversal/);
});
test('negative backend acknowledgement is blocked with error message',()=>{
  assert.throws(()=>validate({ok:false,error:'Terjadi selisih stok'},'SJ'),/Terjadi selisih stok/);
  assert.throws(()=>validate({ok:true,status:'FAILED'},'SJ'),/ditolak|gagal/i);
});
function harness(backendResult){
  const events={removed:[],success:[],close:0};
  const ctx={
    Set,opsWriteInFlightV43:new Set(),
    idemKey:()=> 'idem-write-123456',
    beginBusy:()=>{},endBusy:()=>{},
    toast:(msg)=>events.success.push(msg),
    bridge:{call:async()=>backendResult},
    state:{token:'test'},
    localStorage:{removeItem:k=>events.removed.push(k)},
    closeSheet:()=>events.close++,
    invalidateDataModules:()=>{},
    refreshBootstrapLight:async()=>{},
    console
  };
  const code=helperSource+'\n'+normalWriteSource+'\nwriteDirect';
  const write=vm.runInNewContext(code,ctx);
  return {write,events};
}
test('unverified backend does not erase idempotency key or close form',async()=>{
  const {write,events}=harness(null);
  await assert.rejects(()=>write('purchase','postPurchase',{qty:2}),/belum dapat dipastikan/);
  assert.equal(events.removed.length,0);
  assert.equal(events.close,0);
});
test('pending backend does not erase idempotency key or close form',async()=>{
  const {write,events}=harness({ok:false,status:'POSTING',pendingRecovery:true});
  await assert.rejects(()=>write('purchase','postPurchase',{qty:2}),/recovery/);
  assert.equal(events.removed.length,0);
  assert.equal(events.close,0);
});
test('verified backend clears idempotency key after server acknowledgement',async()=>{
  const {write,events}=harness({ok:true,status:'POSTED',txnId:'PUR-123'});
  const result=await write('purchase','postPurchase',{qty:2});
  assert.equal(result.txnId,'PUR-123');
  assert.deepEqual(events.removed,['ww_gh_idem_purchase']);
  assert.equal(events.close,1);
});
