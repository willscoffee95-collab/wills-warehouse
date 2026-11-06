'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const a=source.indexOf("  const WW_DISPATCH_PENDING_PREFIX_V44=");
const b=source.indexOf("  function dispatchUpdateIfVisibleV44(",a);
assert.ok(a>=0&&b>a,'Pending dispatch lock source must be present');
const chunk=source.slice(a,b);
function fixture({brokenRead=false,brokenWrite=false,discardWrite=false,invalid=''}={}){
  const rows=new Map();
  const localStorage={
    getItem(k){if(brokenRead)throw Error('SecurityError');return rows.has(k)?rows.get(k):null},
    setItem(k,v){if(brokenWrite)throw Error('QuotaExceededError');if(!discardWrite)rows.set(k,String(v))},
    removeItem(k){rows.delete(k)}
  };
  const scope={localStorage,Date,JSON,Error,String};
  const impl=vm.runInNewContext(chunk+'\n({dispatchPendingKeyV44,dispatchPendingV44,dispatchStorePendingV44})',scope);
  const id='SJID-20261105-SAFE';
  const key=impl.dispatchPendingKeyV44(id);
  if(invalid)rows.set(key,invalid);
  return {...impl,id,key,rows};
}

test('good pending key is persisted and read back',()=>{
  const s=fixture();
  assert.equal(s.dispatchPendingV44(s.id),null);
  s.dispatchStorePendingV44(s.id,'dispatch-idempotency-token-123');
  const entry=s.dispatchPendingV44(s.id);
  assert.equal(entry.sjId,s.id);
  assert.equal(entry.idem,'dispatch-idempotency-token-123');
  assert.equal(entry.invalid,undefined);
});

test('blocked browser localStorage reads are treated as pending, not no pending',()=>{
  const s=fixture({brokenRead:true});
  assert.equal(s.dispatchPendingV44(s.id).invalid,true);
  assert.throws(()=>s.dispatchStorePendingV44(s.id,'abc123456789'),/ditahan/);
});

test('write failure fails closed before bridge.call',()=>{
  const s=fixture({brokenWrite:true});
  assert.throws(()=>s.dispatchStorePendingV44(s.id,'abc123456789'),/tidak dapat disimpan/);
  assert.equal(s.dispatchPendingV44(s.id),null);
});

test('silent localStorage write loss fails readback verification',()=>{
  const s=fixture({discardWrite:true});
  assert.throws(()=>s.dispatchStorePendingV44(s.id,'abc123456789'),/tidak dapat disimpan/);
});

test('malformed JSON and empty lock metadata are never considered safe',()=>{
  for(const raw of ['{broken','null','{}',JSON.stringify({sjId:'DIFFERENT',idem:'abc123'})]){
    const s=fixture({invalid:raw});
    assert.equal(s.dispatchPendingV44(s.id).invalid,true);
    assert.throws(()=>s.dispatchStorePendingV44(s.id,'abc123456789'),/ditahan/);
  }
});

test('a second call cannot silently overwrite a pending dispatch lock',()=>{
  const s=fixture();
  s.dispatchStorePendingV44(s.id,'abc123456789');
  assert.throws(()=>s.dispatchStorePendingV44(s.id,'another-token-123'),/ditahan/);
  assert.equal(s.dispatchPendingV44(s.id).idem,'abc123456789');
});

test('missing idempotency key does not create a dispatch lock',()=>{
  const s=fixture();
  assert.throws(()=>s.dispatchStorePendingV44(s.id,''),/Idempotency key/);
  assert.equal(s.dispatchPendingV44(s.id),null);
});

test('dispatch call sets the pending lock before contacting bridge',()=>{
  const s=source.slice(source.indexOf('  async function writeDeliveryDirect('),source.indexOf('  async function callDirect('));
  const first=s.indexOf('dispatchStorePendingV44(sjId,idem)');
  const second=s.indexOf('const remote=bridge.call(method');
  assert.ok(first>=0&&second>first,'Write is guarded before network dispatch');
});
