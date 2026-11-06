'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const p=source.indexOf('    let printRecordBusyV160=false;');
const q=source.indexOf('    const togglePrint=()=>',p);
const g=source.indexOf('  function requireConfirmedWarehouseWriteV160(');
const h=source.indexOf('  const opsWriteInFlightV43=',g);
assert.ok(p>=0&&q>p&&g>=0&&h>g,'Print handler and acknowledgement guard exist');
const chunk=source.slice(g,h)+'\n'+source.slice(p,q)+'\nprintAndRecord';

function harness({response={ok:true},issue=true,bridgeCall=null}={}){
  const calls={printed:0,backend:[],removed:[],messages:[],toggles:0,locked:[],validate:0};
  const storage={removeItem:k=>calls.removed.push(k)};
  const thermal={disabled:false},print={disabled:false},status={textContent:''};
  const ctx={state:{token:'test-token'},requestId:'REQ-20261106-EXAMPLE',id:'REQ-20261106-EXAMPLE',
    source:{sjId:'SJID-123',reviewId:'REV-456'},thermal,print,status,
    opsPrintRequestThermalV43:()=>{calls.printed++;return issue},
    opsPrintRequestV43:()=>{calls.printed++;return issue},
    localStorage:storage,
    lockedMutationIdemV160:async(action,method,payload)=>{calls.locked.push({action,method,payload});return 'idem-from-helper';},
    bridge:{call:async(...args)=>{calls.backend.push(args);return bridgeCall?bridgeCall():response}},
    withBusy:async(_label,fn)=>fn(),
    togglePrint:()=>{calls.toggles++;thermal.disabled=false;print.disabled=false;},
    toast:(message)=>calls.messages.push(String(message)),
    Error,Array,Object,String,JSON
  };
  const run=vm.runInNewContext(chunk,ctx);
  return {run,calls,ctx};
}

test('print record uses payload-bound idempotency and verified backend response',async()=>{
  const h=harness();
  await h.run('THERMAL');
  assert.equal(h.calls.printed,1);
  assert.equal(h.calls.backend.length,1);
  assert.equal(h.calls.locked.length,1);
  assert.equal(h.calls.locked[0].method,'markWarehousePickingPrintRequestedV1526');
  assert.equal(h.calls.locked[0].payload.sjId,'SJID-123');
  assert.deepEqual(h.calls.removed,['ww_gh_idem_print_THERMAL_REQ-20261106-EXAMPLE']);
  assert.match(h.ctx.status.textContent,/telah dicatat/);
  assert.equal(h.calls.toggles,1);
});

test('missing print audit acknowledgement does not clear local transaction key',async()=>{
  const h=harness({response:null});
  await h.run('A4');
  assert.equal(h.calls.backend.length,1);
  assert.equal(h.calls.removed.length,0);
  assert.ok(h.calls.messages.some(m=>m.includes('belum terverifikasi')));
});

test('backend pending recovery cannot be mistaken for successful print audit',async()=>{
  const h=harness({response:{ok:true,status:'POSTING',pendingRecovery:true}});
  await h.run('THERMAL');
  assert.equal(h.calls.removed.length,0);
  assert.equal(h.calls.backend.length,1);
});

test('double-click print opens one print action and sends one audit write',async()=>{
  let resolve;
  const waiting=new Promise(ok=>resolve=ok);
  const h=harness({bridgeCall:()=>waiting});
  const first=h.run('THERMAL');
  const second=h.run('THERMAL');
  await second;
  assert.equal(h.calls.printed,1);
  assert.equal(h.calls.backend.length,1);
  resolve({ok:true});
  await first;
  assert.equal(h.calls.removed.length,1);
});

test('cancelled print never records an audit write',async()=>{
  const h=harness({issue:false});
  await h.run('THERMAL');
  assert.equal(h.calls.backend.length,0);
  assert.equal(h.calls.removed.length,0);
  assert.equal(h.calls.toggles,1);
});
