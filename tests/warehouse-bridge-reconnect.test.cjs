'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','bridge.js'),'utf8');

function fakeBrowser(){
  const handlers=new Map(),timers=new Map(),iframes=[];
  let nextTimer=1,nextRequest=0;
  const document={
    createElement(tag){
      assert.equal(tag,'iframe');
      const el={id:'',title:'',src:'',style:{},setAttribute:()=>{},
        parentNode:null,removed:false};
      iframes.push(el);return el;
    },
    body:{
      appendChild(el){el.parentNode=this;},
      removeChild(el){el.removed=true;el.parentNode=null;}
    }
  };
  const window={
    WILLS_CONFIG:{APPS_SCRIPT_URL:'https://script.google.com/macros/s/EXAMPLE0123456789/exec'},
    crypto:{randomUUID:()=> 'req-'+(++nextRequest)},
    addEventListener:(name,fn)=>handlers.set(name,fn)
  };
  const context={window,document,Date,Math,Map,Promise,String,Error,JSON,RegExp,
    setTimeout(fn,delay){const id=nextTimer++;timers.set(id,{fn,delay});return id;},
    clearTimeout(id){timers.delete(id);}
  };
  vm.runInNewContext(source,context);
  const send=(data,source,origin='https://script.google.com')=>
    handlers.get('message')({data,source,origin});
  const fire=(delay)=>{
    for(const [id,t] of [...timers]){
      if(t.delay===delay){timers.delete(id);t.fn();}
    }
  };
  const responder=()=>{
    const calls=[];
    return {calls,postMessage(payload,origin){calls.push({payload,origin});}};
  };
  return {bridge:window.WILLS_BRIDGE,window,iframes,send,fire,timers,responder};
}

test('bridge only accepts correct Google Apps Script deployment URLs',()=>{
  const s=fakeBrowser();
  assert.equal(s.bridge.validWebAppUrl('https://script.google.com/macros/s/EXAMPLE/exec'),true);
  assert.equal(s.bridge.validWebAppUrl('https://evil.test/macros/s/EXAMPLE/exec'),false);
  assert.equal(s.bridge.validWebAppUrl('http://script.google.com/macros/s/X/exec'),false);
});

test('untrusted READY is ignored, trusted READY establishes a channel',async()=>{
  const s=fakeBrowser(),p=s.bridge.init();
  const wrong=s.responder(),trusted=s.responder();
  s.send({type:'WW_BRIDGE_READY'},wrong,'https://example.com');
  assert.equal(s.timers.size,1);
  s.send({type:'WW_BRIDGE_READY',bridgeVersion:'4.1.0'},trusted);
  const ready=await p;
  assert.equal(ready.origin,'https://script.google.com');
  assert.equal(ready.version,'4.1.0');
  assert.equal(s.timers.size,0);
  assert.equal(s.iframes.length,1);
});

test('late READY from another source cannot replace the established bridge',async()=>{
  const s=fakeBrowser(),p=s.bridge.init(),primary=s.responder(),intruder=s.responder();
  s.send({type:'WW_BRIDGE_READY'},primary);
  await p;
  s.send({type:'WW_BRIDGE_READY'},intruder,'https://script.google.com');
  const result=s.bridge.call('getAppModule','SESSION','delivery');
  await Promise.resolve();
  assert.equal(primary.calls.length,1);
  assert.equal(intruder.calls.length,0);
  const requestId=primary.calls[0].payload.requestId;
  s.send({type:'WW_BRIDGE_RESPONSE',requestId,ok:true,value:{ok:true}},primary);
  assert.equal((await result).ok,true);
});

test('failed READY timeout permits a new explicit initialization without auto-replaying calls',async()=>{
  const s=fakeBrowser(),pending=s.bridge.init();
  s.fire(15000);
  await assert.rejects(pending,/Bridge Apps Script tidak merespons/);
  assert.equal(s.iframes[0].removed,true);
  const second=s.bridge.init();
  assert.equal(s.iframes.length,2);
  const backend=s.responder();
  s.send({type:'WW_BRIDGE_READY'},backend);
  await second;
  assert.equal(backend.calls.length,0);
});

test('a spoofed response from wrong origin or window is ignored',async()=>{
  const s=fakeBrowser(),p=s.bridge.init(),primary=s.responder(),other=s.responder();
  s.send({type:'WW_BRIDGE_READY'},primary);await p;
  const result=s.bridge.call('getAppModule','SESSION','delivery');await Promise.resolve();
  const requestId=primary.calls[0].payload.requestId;
  s.send({type:'WW_BRIDGE_RESPONSE',requestId,ok:true,value:'wrong'},other);
  s.send({type:'WW_BRIDGE_RESPONSE',requestId,ok:true,value:'wrong'},primary,'https://evil.test');
  assert.equal(s.timers.size,1); // 3-minute timer still pending
  s.send({type:'WW_BRIDGE_RESPONSE',requestId,ok:true,value:'correct'},primary);
  assert.equal(await result,'correct');
});

test('postMessage exception rejects immediately instead of waiting 3 minutes',async()=>{
  const s=fakeBrowser(),p=s.bridge.init();
  const backend={postMessage(){throw Error('Frame navigated');}};
  s.send({type:'WW_BRIDGE_READY'},backend);await p;
  const result=s.bridge.call('getAppModule','SESSION','delivery');
  await assert.rejects(result,/Frame navigated/);
  assert.equal(s.timers.size,0);
});

test('RPC timeout is a failure, not an automatic resend',async()=>{
  const s=fakeBrowser(),p=s.bridge.init(),backend=s.responder();
  s.send({type:'WW_BRIDGE_READY'},backend);await p;
  const result=s.bridge.call('dispatchDelivery','token',{sjId:'SJ-1'},'idem-1');
  await Promise.resolve();
  assert.equal(backend.calls.length,1);
  s.fire(180000);
  await assert.rejects(result,/Jangan ulangi transaksi stok/);
  assert.equal(backend.calls.length,1);
});
