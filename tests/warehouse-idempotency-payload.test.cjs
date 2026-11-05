'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=source.indexOf('  function canonicalMutationPayloadV160(');
const end=source.indexOf('  // v1.6: fail closed when a mutation response',start);
assert.ok(start>=0&&end>start,'The idempotency helper must be present');
const code=source.slice(start,end)+'\nlockedMutationIdemV160';

function harness(options={}){
  let now=options.now||1000000000000;
  const map=new Map();
  const localStorage={
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key)
  };
  const fakeCrypto={
    randomUUID:()=> 'db89f5d3-7a8d-443b-8c50-b9faaa012345',
    subtle:{
      digest:async (algorithm,bytes)=>{
        assert.equal(algorithm,'SHA-256');
        if(options.onDigest)await options.onDigest({map,localStorage});
        return Uint8Array.from(createHash('sha256').update(Buffer.from(bytes)).digest()).buffer;
      }
    }
  };
  const DateProxy=class extends Date {static now(){return now;}};
  const context={window:{crypto:fakeCrypto}, TextEncoder,Uint8Array,Array,Object,String,Number,
    JSON,Error,Date:DateProxy,Math,localStorage};
  const run=vm.runInNewContext(code,context);
  return {
    run,map,localStorage,clock:(n)=>{now=n;},
    unsetCrypto:()=>{context.window.crypto.subtle=null;},
    key:action=>JSON.parse(map.get('ww_gh_idem_'+action)||'null')
  };
}
const action='purchase',method='postPurchase';

test('same method and same exact payload returns the same key',async()=>{
  const h=harness();
  const a=await h.run(action,method,{supplier:{name:'A'},items:[{code:'B01',qty:2}]});
  const b=await h.run(action,method,{items:[{qty:2,code:'B01'}],supplier:{name:'A'}});
  assert.equal(a,b);
  assert.equal(h.key(action).method,method);
  assert.match(h.key(action).payloadHash,/^[0-9a-f]{64}$/);
});

test('changing purchase quantity after uncertain write is blocked, prior key preserved',async()=>{
  const h=harness();
  const id=await h.run(action,method,{items:[{code:'B01',qty:2}]});
  await assert.rejects(h.run(action,method,{items:[{code:'B01',qty:3}]}),/Isi transaksi berbeda/);
  assert.equal(h.key(action).id,id);
});

test('same action using another backend method cannot silently reuse an idempotency key',async()=>{
  const h=harness();
  await h.run('syncPrice','syncOutletReceiptInternalPricesNow',{});
  await assert.rejects(h.run('syncPrice','postPurchase',{}),/Isi transaksi berbeda/);
});

test('unresolved key stays pinned after more than 24 hours',async()=>{
  const h=harness({now:1000000000000});
  const id=await h.run(action,method,{items:[{code:'B01',qty:2}]});
  h.clock(1000000000000+5*86400000);
  const retried=await h.run(action,method,{items:[{code:'B01',qty:2}]});
  assert.equal(retried,id);
});

test('legacy unbound idempotency key is not silently rebound to a new purchase',async()=>{
  const h=harness();
  h.localStorage.setItem('ww_gh_idem_purchase',JSON.stringify({id:'purchase:old-id-abcdef',ts:10000}));
  await assert.rejects(h.run(action,method,{items:[{qty:2}]}),/versi lama yang belum terverifikasi/);
  assert.equal(h.key(action).id,'purchase:old-id-abcdef');
});

test('invalid/corrupt persisted key stops transaction without replacing it',async()=>{
  const h=harness();
  h.localStorage.setItem('ww_gh_idem_purchase','{not-json');
  await assert.rejects(h.run(action,method,{items:[{qty:2}]}),/rusak/);
  assert.equal(h.localStorage.getItem('ww_gh_idem_purchase'),'{not-json');
});

test('request digest does not persist a plaintext PIN or price details to localStorage',async()=>{
  const h=harness();
  await h.run('userSave_owner','saveUser',{username:'owner',pin:'92735811',secret:'AVOID_PERSISTING'});
  const stored=h.localStorage.getItem('ww_gh_idem_userSave_owner');
  assert.equal(stored.includes('92735811'),false);
  assert.equal(stored.includes('AVOID_PERSISTING'),false);
});

test('failure of cryptographic verification blocks posting',async()=>{
  const h=harness();h.unsetCrypto();
  await assert.rejects(h.run(action,method,{qty:3}),/browser ini/);
  assert.equal(h.key(action),null);
});

test('a concurrent tab replacing key during digest cannot replace the lock silently',async()=>{
  const h=harness({onDigest:({localStorage})=>{
    localStorage.setItem('ww_gh_idem_purchase',JSON.stringify({id:'purchase:other-tab-123456',ts:123}));
  }});
  await assert.rejects(h.run(action,method,{qty:3}),/versi lama yang belum terverifikasi/);
});

test('an expired pending key cannot be bypassed by changing action payload after a week',async()=>{
  const h=harness();
  await h.run('adjustment','ownerPostStockAdjustmentV1527',{items:[{code:'B03',physicalQtyBase:1200}]});
  h.clock(1000000000000+7*86400000);
  await assert.rejects(h.run('adjustment','ownerPostStockAdjustmentV1527',{items:[{code:'B03',physicalQtyBase:0}]}),/Isi transaksi berbeda/);
});
