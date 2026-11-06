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


test('two browser tabs with Web Locks reserve one shared idempotency key',async()=>{
  const records=new Map(),queue=new Map(),acquired=[];
  const storage={
    getItem:k=>records.has(k)?records.get(k):null,
    setItem:(k,v)=>records.set(k,String(v)),
    removeItem:k=>records.delete(k)
  };
  const locks={
    request(name,options,fn){
      assert.equal(options.mode,'exclusive');
      const prev=queue.get(name)||Promise.resolve();
      let unlock;
      const gate=new Promise(resolve=>{unlock=resolve});
      queue.set(name,prev.then(()=>gate));
      return prev.then(async()=>{acquired.push(name);try{return await fn()}finally{unlock()}});
    }
  };
  const tab=(suffix)=>{
    const crypto={
      randomUUID:()=> 'tab-'+suffix+'-unique-00000001',
      subtle:{digest:async (_algo,bytes)=>{
        await new Promise(resolve=>setImmediate(resolve));
        return Uint8Array.from(createHash('sha256').update(Buffer.from(bytes)).digest()).buffer;
      }}
    };
    return vm.runInNewContext(code,{navigator:{locks},window:{crypto},localStorage:storage,
      TextEncoder,Uint8Array,Array,Object,String,Number,JSON,Error,Date,Math});
  };
  const first=tab('A'),second=tab('B'),payload={items:[{code:'B01',qty:3}]};
  const [id1,id2]=await Promise.all([
    first('purchase','postPurchase',payload),second('purchase','postPurchase',payload)
  ]);
  assert.equal(id1,id2);
  assert.equal(acquired.length,2);
  assert.equal(JSON.parse(records.get('ww_gh_idem_purchase')).id,id1);
});

test('two browser tabs cannot silently replace an in-flight key with different quantities',async()=>{
  const records=new Map(),queue=new Map();
  const storage={getItem:k=>records.has(k)?records.get(k):null,
    setItem:(k,v)=>records.set(k,String(v)),removeItem:k=>records.delete(k)};
  const locks={request(name,_opts,fn){
    const prev=queue.get(name)||Promise.resolve();
    let release;const done=new Promise(resolve=>release=resolve);
    queue.set(name,prev.then(()=>done));
    return prev.then(async()=>{try{return await fn()}finally{release()}});
  }};
  const invoke=()=>vm.runInNewContext(code,{
    navigator:{locks},window:{crypto:{randomUUID:()=> 'example-uuid',
      subtle:{digest:async (_algo,bytes)=>Uint8Array.from(createHash('sha256').update(Buffer.from(bytes)).digest()).buffer}}},
    localStorage:storage,TextEncoder,Uint8Array,Array,Object,String,Number,JSON,Error,Date,Math
  });
  const a=invoke(),b=invoke();
  const results=await Promise.allSettled([
    a('purchase','postPurchase',{items:[{qty:2}]}),
    b('purchase','postPurchase',{items:[{qty:4}]})
  ]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
  assert.match(String(results.find(x=>x.status==='rejected').reason),/Isi transaksi berbeda/);
});


test('user-management PIN is never stored as a reversible low-entropy payload digest',async()=>{
  const h=harness();
  const action='userSave_ari@example.com';
  const first=await h.run(action,'saveUser',{username:'ari@example.com',pin:'0000',role:'ADMIN_2'});
  assert.match(first,/^[A-Za-z0-9._:-]{12,120}$/);
  const stored=h.key(action);
  assert.equal(stored.secretPayload,true);
  assert.equal(Object.hasOwn(stored,'payloadHash'),false);
  assert.equal(JSON.stringify(stored).includes('0000'),false);
  assert.equal(JSON.stringify(stored).includes('ari@example.com'),false);
  await assert.rejects(h.run(action,'saveUser',{username:'ari@example.com',pin:'0000',role:'ADMIN_2'}),/PIN belum terverifikasi/);
  assert.equal(h.key(action).id,first);
});

test('valid nonsecret saveUser action still fingerprints normal user status updates',async()=>{
  const h=harness();
  const id=await h.run('userStatus_email@example.com','saveUser',{username:'email@example.com',pin:'',active:'TIDAK'});
  assert.match(id,/^[A-Za-z0-9._:-]{12,120}$/);
  assert.match(h.key('userStatus_email@example.com').payloadHash,/^[0-9a-f]{64}$/);
  assert.notEqual(h.key('userStatus_email@example.com').secretPayload,true);
});
