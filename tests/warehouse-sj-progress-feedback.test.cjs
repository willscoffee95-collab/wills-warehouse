'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../app.css'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const SJ='SJID-TEST-15';
function between(first,last){
  const i=app.indexOf(first),j=app.indexOf(last,i+first.length);
  assert.ok(i>=0&&j>i,'missing source boundary '+first);
  return app.slice(i,j);
}
function noteHarness(){
  let at=1000,pending=true;
  const active=new Set(['dispatch_'+SJ]),watchers=new Map(),
    times={textContent:''},guidance={textContent:''};
  let scheduled=0,stopped=0,fn=null;
  const progress={
    querySelector:k=>k==='[data-ww-sj-progress-time]'?times:
      k==='[data-ww-sj-progress-guidance]'?guidance:null
  };
  const sheet={dataset:{sheetKey:'delivery-detail:'+SJ},
    querySelector:key=>key==='[data-ww-sj-progress-v15215]'?progress:null};
  const root={firstElementChild:sheet};
  const ctx={String,Number,Math,Map,Set,
    Date:{now:()=>at},
    dispatchPendingV44:()=>pending?{sjId:SJ,startedAt:1000}:null,
    opsWriteInFlightV43:active,
    wwDispatchWatchersV15214:watchers,
    $:key=>key==='#sheetRoot'?root:null,
    setInterval:cb=>{scheduled++;fn=cb;return scheduled},
    clearInterval:()=>{stopped++}
  };
  const api=vm.runInNewContext(
    between('  function wwSjDispatchNoteV15213(id,d){','  function wwSjRenderLinesV15213(d){')+
      '\n({wwSjDispatchNoteV15213,wwSjProgressEnsureV15215,wwSjProgressStopV15215,wwSjProgressTimersV15215})',ctx);
  return {api,active,watchers,progress,times,guidance,
    setTime:x=>{at=x},setPending:x=>{pending=x},
    tick:()=>fn&&fn(),get scheduled(){return scheduled},get stopped(){return stopped}};
}

test('persistent sending notice uses spinner and explicit do-not-click-again wording',()=>{
  const h=noteHarness();
  const txt=h.api.wwSjDispatchNoteV15213(SJ,{status:'DRAFT'});
  assert.match(txt,/Sedang memproses pengiriman/);
  assert.match(txt,/ww-spin-v1526/);
  assert.match(txt,/Jangan|jangan tekan tombol Kirim lagi/);
  assert.match(txt,/data-ww-sj-progress-time/);
  assert.doesNotMatch(txt,/Konfirmasi Kirim sekali lagi/);
});

test('elapsed waiting time updates text only and guidance becomes stronger after a delay',()=>{
  const h=noteHarness();
  h.api.wwSjProgressEnsureV15215(SJ);
  assert.equal(h.scheduled,1,'one client-side timer');
  assert.equal(h.times.textContent,'Waktu proses: 00:00');
  h.setTime(17000);h.tick();
  assert.equal(h.times.textContent,'Waktu proses: 00:16');
  assert.match(h.guidance.textContent,/lebih lama/);
  h.setTime(38000);h.tick();
  assert.equal(h.times.textContent,'Waktu proses: 00:37');
  assert.match(h.guidance.textContent,/mungkin sudah tercatat/);
  h.api.wwSjProgressEnsureV15215(SJ);
  assert.equal(h.scheduled,1,'second update must not create a second interval');
  assert.equal(h.api.wwSjProgressTimersV15215.size,1);
  h.setPending(false);h.tick();
  assert.equal(h.api.wwSjProgressTimersV15215.size,0,'finished transaction stops timer');
  assert.equal(h.stopped,1);
});

test('after automatic verifier stops, status offers read-only check not an infinite spinner',()=>{
  const h=noteHarness();
  h.active.clear();
  const msg=h.api.wwSjDispatchNoteV15213(SJ,{status:'DRAFT'});
  assert.match(msg,/Status Kirim belum dapat dipastikan/);
  assert.match(msg,/Cek Status Kirim/);
  assert.doesNotMatch(msg,/ww-spin-v1526/);
  const delivered=h.api.wwSjDispatchNoteV15213(SJ,{
    status:'DIKIRIM',dispatchTxnId:'DSP-1'
  });
  assert.match(delivered,/Berhasil dikirim — silakan Cetak SJ/);
});

test('a pending dispatch hides other destructive/double-send actions',()=>{
  const icons={printer:'<svg/>',clipboard:'<svg/>',warning:'<svg/>',clock:'<svg/>',truck:'<svg/>'};
  const render=vm.runInNewContext(
    between('  function wwSjActionMarkupV15211(','  // Network operations always show')+
    '\nwwSjActionMarkupV15211',{String,icons});
  const d={status:'DRAFT'},p={canPrint:true,canCancel:true,canPrepare:true,canDispatch:true};
  const waiting=render(d,{requestId:'R1'},p,true,true);
  assert.match(waiting,/Sedang diproses · Jangan klik ulang/);
  assert.match(waiting,/id="wwSjWaitingV15215"/);
  assert.match(waiting,/disabled aria-busy="true"/);
  assert.equal((waiting.match(/<button /g)||[]).length,1);
  for(const unsafe of ['ghSendSj','ghCancelSj','wwSjCheckMaterialsV15210','ghPrintSj'])
    assert.ok(!waiting.includes(unsafe),unsafe+' cannot be clicked');
  const uncertain=render(d,{requestId:'R1'},p,true,false);
  assert.match(uncertain,/Cek Status Kirim/);
  assert.equal((uncertain.match(/<button /g)||[]).length,1);
  assert.doesNotMatch(uncertain,/ghSendSj|ghCancelSj/);
  const confirmed=render({status:'DIKIRIM'},{},p,false,false);
  assert.match(confirmed,/Cetak Thermal · SIAP KIRIM/);
});

test('one tap disables Send and sibling buttons, restoring on blocked local-only operation',async()=>{
  const siblings=[{disabled:false},{disabled:false}],classes=new Set(),atts={};
  const panel={querySelectorAll:()=>[button,...siblings]};
  const button={
    id:'ghSendSj',disabled:false,isConnected:true,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
    setAttribute:(k,v)=>{atts[k]=v},
    removeAttribute:k=>{delete atts[k]},
    closest:()=>panel
  };
  const wrap=vm.runInNewContext(
    between('  async function wwSjWithLoadingV15211(button,operation){',
            '  // Shared bindings for initial render')+
    '\nwwSjWithLoadingV15211',{});
  const state=[];
  const result=await wrap(button,async()=>{
    state.push([button.disabled,siblings.every(x=>x.disabled),classes.has('is-loading')]);
    const duplicate=await wrap(button,async()=>{throw Error('cannot call twice')});
    assert.equal(duplicate,null);
    return {ok:false,blocked:true};
  });
  assert.equal(result.blocked,true);
  assert.deepEqual(state,[[true,true,true]]);
  assert.equal(button.disabled,false);
  assert.ok(siblings.every(x=>!x.disabled));
  assert.ok(!classes.has('is-loading'));
  assert.equal(atts['aria-busy'],undefined);
});

test('progress remains on same SJ sheet, no extra dispatch write calls or full reload',()=>{
  const update=between('  function wwSjUpdateDetailV15213(id){','  function wwSjUpdateListV15213(id){');
  assert.match(update,/currentStage!==nextStage/);
  assert.match(update,/wwSjProgressEnsureV15215\(id\)/);
  assert.doesNotMatch(update,/directDeliveryDetail\(id\)|reloadDeliveryModule\(/);
  const send=between('  async function writeDeliveryDirect(action,method,payload,sjId){','  async function callDirect(method,...args)');
  assert.match(send,/dispatchPendingV44\(sjId\)/);
  assert.match(send,/wwDispatchStartWatchV15214\(sjId\)/);
});

test('new version and CSS styles included in PWA assets',()=>{
  const v='1.5.2.16-so-fisik-0811';
  assert.ok(index.includes('app.js?v='+v));
  assert.ok(index.includes('app.css?v='+v));
  assert.ok(sw.includes('app.js?v='+v));
  assert.ok(sw.includes('app.css?v='+v));
  assert.ok(sw.includes('wills-warehouse-shell-v'+v));
  assert.ok(app.includes("WW_FRONTEND_BUILD='2026-11-08."+v+"'"));
  assert.match(css,/\.ww-sj-progress-copy/);
  assert.match(css,/\.ww-sj-progress--done/);
});
