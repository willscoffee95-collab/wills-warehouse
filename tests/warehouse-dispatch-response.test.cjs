'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const a=source.indexOf('  function dispatchAcceptResponseV44(');
const b=source.indexOf('\n  async function writeDeliveryDirect(',a);
assert.ok(a>=0&&b>a,'dispatch response handler exists');
const snippet=source.slice(a,b);

function harness(){
  const calls={verified:0,refresh:0,warning:0,accepted:0};
  const ctx={
    toast:()=>{calls.warning++},
    dispatchUpdateIfVisibleV44:()=>{calls.refresh++},
    dispatchApplyStatusV44:()=>{calls.verified++;return true;},
    reloadDeliveryModule:async()=>{calls.accepted++;},
    console
  };
  const receive=vm.runInNewContext(snippet+'\ndispatchAcceptResponseV44',ctx);
  return {receive,calls};
}

test('missing or ambiguous dispatch acknowledgement never reaches status-unlock path',()=>{
  const {receive,calls}=harness();
  for(const response of [null,undefined,{}, {status:'POSTED'}, {ok:false,status:'POSTED'}])
    receive('SJID-A',response);
  assert.equal(calls.verified,0);
  assert.equal(calls.warning,5);
});

test('reversed, posting and pending recovery responses cannot release dispatch lock',()=>{
  const {receive,calls}=harness();
  for(const response of [
    {ok:true,status:'REVERSED',deliveryV1354:{sjId:'SJID-A',status:'DIKIRIM'}},
    {ok:true,status:'POSTING',deliveryV1354:{sjId:'SJID-A',status:'DIKIRIM'}},
    {ok:true,pendingRecovery:true,deliveryV1354:{sjId:'SJID-A',status:'DIKIRIM'}},
    {ok:true,status:'PENDING_RECOVERY'}
  ])receive('SJID-A',response);
  assert.equal(calls.verified,0);
  assert.equal(calls.warning,4);
});

test('positive server acknowledgement still verifies the SJ status',()=>{
  const {receive,calls}=harness();
  receive('SJID-A',{ok:true,status:'POSTED',deliveryV1354:{sjId:'SJID-A',status:'DIKIRIM'}});
  assert.equal(calls.verified,1);
});
