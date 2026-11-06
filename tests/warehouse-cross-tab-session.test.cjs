'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=source.indexOf('  function invalidateSessionV1360(');
const stop=source.indexOf('  let activePage',start);
assert.ok(start>=0&&stop>start,'authentication invalidation functions exist');
const code=source.slice(start,stop)+'\n({invalidateSessionV1360,onWarehouseAuthStorageV160})';
const TOKEN_KEY='ww_github_token_v1';

function setup(){
  const records=new Map([[TOKEN_KEY,'token-A']]),log={removed:[],messages:[],reset:0,clearSnapshot:0};
  const dom={
    '#mainView':{classList:{add:k=>log.messages.push('main:'+k)}},
    '#loginView':{classList:{remove:k=>log.messages.push('login:'+k)}}
  };
  const state={token:'token-A',data:{user:{id:'OWNER'}},moduleReady:{delivery:true},modulePromises:{delivery:'cached'}};
  const ctx={TOKEN_KEY,state,localStorage:{
    removeItem:k=>{log.removed.push(k);records.delete(k);}
  },
  clearBootstrapSnapshotV1360:()=>{log.clearSnapshot++;},
  resetSheetNavigation:()=>{log.reset++;},
  toast:m=>log.messages.push(m),
  $:q=>dom[q],
  appHistoryReady:true,
  Object,JSON,String};
  const handlers=vm.runInNewContext(code,ctx);
  return {state,records,log,...handlers};
}

test('logout in another tab clears this stale session without touching storage',()=>{
  const a=setup();
  a.records.delete(TOKEN_KEY);
  a.onWarehouseAuthStorageV160({key:TOKEN_KEY,oldValue:'token-A',newValue:null});
  assert.equal(a.state.token,'');
  assert.equal(a.state.data,null);
  assert.equal(a.log.removed.length,0);
  assert.equal(a.log.clearSnapshot,0);
  assert.equal(a.log.reset,1);
  assert.ok(a.log.messages.includes('main:is-hidden'));
  assert.ok(a.log.messages.includes('login:is-hidden'));
});

test('another tab signing in as a new user is not logged out by this tab',()=>{
  const a=setup();
  a.records.set(TOKEN_KEY,'token-B');
  a.onWarehouseAuthStorageV160({key:TOKEN_KEY,oldValue:'token-A',newValue:'token-B'});
  assert.equal(a.records.get(TOKEN_KEY),'token-B');
  assert.deepEqual(a.log.removed,[]);
  assert.equal(a.state.token,'');
});

test('same-token and unrelated storage events do not sign the user out',()=>{
  const a=setup();
  a.onWarehouseAuthStorageV160({key:TOKEN_KEY,newValue:'token-A'});
  a.onWarehouseAuthStorageV160({key:'ww_github_bootstrap_v1521',newValue:null});
  a.onWarehouseAuthStorageV160(null);
  assert.equal(a.state.token,'token-A');
  assert.equal(a.log.reset,0);
});

test('explicit session invalidation still deletes this tab’s stored token',()=>{
  const a=setup();
  a.invalidateSessionV1360('Expired');
  assert.equal(a.records.has(TOKEN_KEY),false);
  assert.deepEqual(a.log.removed,[TOKEN_KEY]);
  assert.equal(a.log.clearSnapshot,1);
});

test('storage invalidation listener is registered before PWA boot',()=>{
  const listener=source.indexOf("window.addEventListener('storage',onWarehouseAuthStorageV160)");
  const boot=source.lastIndexOf('  boot();');
  assert.ok(listener>=0&&listener<boot);
});
