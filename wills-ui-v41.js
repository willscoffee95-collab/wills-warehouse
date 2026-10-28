/* Wills Warehouse Elegant Red v4.1 · read-only operational signals.
   No transaction writes. Sound only after click, while the app is open. */
(() => {
  'use strict';
  const PREFIX='ww_v41_receipts_seen_', TOKEN_KEY='ww_github_token_v1', POLL_MS=75000;
  let userId='default',seen=null,firstPoll=true,soundReady=false,audioCtx=null,polling=false,unsupported=false;
  let messages=['Menyinkronkan informasi stok gudang…'],toastTimer=0;
  const q=s=>document.querySelector(s);
  const str=v=>String(v==null?'':v);
  const inApp=()=>!!q('#mainView:not(.is-hidden)');
  const eventId=x=>str(x.sjId)+'|'+str(x.receivedAt)+'|'+str(x.status);
  const key=()=>PREFIX+userId.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
  function escapeHtml(value){return str(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function setupUser(next){
    const id=str(next).trim()||'default';
    if(id!==userId){userId=id;seen=null;firstPoll=true;unsupported=false;refreshButton();}
  }
  function loadSeen(){try{return new Set(JSON.parse(localStorage.getItem(key())||'null')||[]);}catch(_){return new Set();}}
  function saveSeen(){try{localStorage.setItem(key(),JSON.stringify(Array.from(seen).slice(-180)));}catch(_){}}
  function notice(title,detail){
    let node=q('#wwV41EventToast');
    if(!node){node=document.createElement('div');node.id='wwV41EventToast';node.className='ww-v41-event-toast';
      node.setAttribute('role','status');node.setAttribute('aria-live','polite');document.body.appendChild(node);}
    node.innerHTML='<b>'+escapeHtml(title)+'</b><small>'+escapeHtml(detail)+'</small>';
    node.hidden=false;clearTimeout(toastTimer);const hide=()=>{clearTimeout(toastTimer);node.hidden=true;};if(window.wwAttachSwipeToastV1522)window.wwAttachSwipeToastV1522(node,hide);toastTimer=setTimeout(hide,9500);
  }
  function ticker(){
    const track=q('#wwV41TickerTrack');if(!track)return;
    const entries=messages.length?messages:['Stok gudang terpantau · Belum ada peringatan stok'];
    const fragment=entries.slice(0,16).map(x=>'<span><strong>●</strong>'+escapeHtml(x)+'</span>').join('');
    track.innerHTML=fragment+fragment;track.style.animationDuration=Math.max(24,entries.length*7)+'s';
    track.setAttribute('aria-label',entries.join('; '));
  }
  function fromBootstrap(stock,stale){
    if(!Array.isArray(stock))return;
    const list=stock.map(s=>{
      const qty=Number(s.qty||0),min=Number(s.minimum||0),safety=Number(s.safety||0),raw=str(s.status).toUpperCase();
      const level=qty<=0?'HABIS':((min>0&&qty<=min)||/KRITIS|CRITICAL/.test(raw))?'KRITIS':
        ((safety>0&&qty<=safety)||/MENIPIS|LOW|PERHATIAN/.test(raw))?'MENIPIS':'';
      return level?{level,name:str(s.name||s.code||'Bahan'),qty,unit:str(s.baseUnit||'')}:null;
    }).filter(Boolean).sort((a,b)=>({HABIS:0,KRITIS:1,MENIPIS:2}[a.level]-{HABIS:0,KRITIS:1,MENIPIS:2}[b.level]));
    const fmt=new Intl.NumberFormat('id-ID',{maximumFractionDigits:2});
    messages=list.slice(0,16).map(x=>x.level+': '+x.name+' · '+fmt.format(x.qty)+' '+x.unit+(stale?' (snapshot)':''));
    ticker();
  }
  function fromSignals(alerts){
    if(!Array.isArray(alerts))return;
    messages=alerts.slice(0,16).map(x=>str(x.level)+': '+str(x.name)+' · '+str(x.qtyLabel||(x.qty+' '+str(x.unit))));
    ticker();
  }
  function refreshButton(){
    const btn=q('#wwV41Sound');if(!btn)return;
    btn.dataset.enabled=soundReady?'true':'false';btn.dataset.unsupported=unsupported?'true':'false';
    btn.textContent=soundReady?'♪':'♩';btn.setAttribute('aria-label',soundReady?'Suara notifikasi aktif':'Aktifkan suara notifikasi');
    btn.title=unsupported?'Bridge belum mengizinkan wwUiV4Signals; notifikasi penerimaan belum tersedia':
      soundReady?'Suara aktif selama aplikasi terbuka':'Ketuk untuk mengaktifkan suara notifikasi';
  }
  function beep(){
    if(!soundReady||!audioCtx||audioCtx.state!=='running')return;
    const time=audioCtx.currentTime;
    [0,.18].forEach((delta,i)=>{
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type='sine';osc.frequency.value=i?900:720;
      gain.gain.setValueAtTime(.0001,time+delta);
      gain.gain.exponentialRampToValueAtTime(.10,time+delta+.014);
      gain.gain.exponentialRampToValueAtTime(.0001,time+delta+.16);
      osc.connect(gain);gain.connect(audioCtx.destination);
      osc.start(time+delta);osc.stop(time+delta+.17);
    });
  }
  async function activateSound(){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx){notice('Audio tidak tersedia','Browser tidak mendukung suara notifikasi.');return;}
    try{
      if(!audioCtx)audioCtx=new Ctx();
      if(audioCtx.state==='suspended')await audioCtx.resume();
      soundReady=audioCtx.state==='running';refreshButton();
      if(soundReady){beep();notice('Suara aktif','Bunyi hanya untuk penerimaan SJ baru ketika aplikasi terbuka.');}
    }catch(_){notice('Audio belum diizinkan','Ketuk tombol suara kembali setelah browser memberikan izin.');}
  }
  function processEvents(events){
    if(!Array.isArray(events))return;
    if(!seen){seen=loadSeen();firstPoll=seen.size===0;}
    const valid=events.filter(x=>x&&x.sjId&&x.receivedAt),ids=valid.map(eventId);
    if(firstPoll){ids.forEach(x=>seen.add(x));firstPoll=false;saveSeen();return;}
    const fresh=valid.filter(x=>!seen.has(eventId(x)));
    ids.forEach(x=>seen.add(x));
    if(seen.size>180)seen=new Set(Array.from(seen).slice(-180));
    saveSeen();
    if(fresh.length){
      const x=fresh[fresh.length-1];
      notice('Bahan diterima outlet',str(x.noSj)+' · '+str(x.outletName||x.outletCode)+' · '+str(x.status)+
        (fresh.length>1?' · +'+(fresh.length-1)+' SJ lain':''));
      beep();
    }
  }
  async function poll(){
    if(polling||unsupported||document.visibilityState==='hidden'||!inApp())return;
    const token=str(localStorage.getItem(TOKEN_KEY));
    if(!token||!window.WILLS_BRIDGE||typeof window.WILLS_BRIDGE.call!=='function')return;
    polling=true;
    try{
      const result=await window.WILLS_BRIDGE.call('wwUiV4Signals',token);
      if(!result||result.ok!==true||result.readOnly!==true)throw Error('Respons sinyal tidak valid.');
      fromSignals(result.stockAlerts);processEvents(result.receivedEvents);
    }catch(err){
      const reason=str(err&&err.message||err);
      if(/tidak diizinkan|not allowed|method backend tidak tersedia/i.test(reason)){
        unsupported=true;refreshButton();
        console.warn('[Wills v4.1] Feed penerimaan menunggu izin allowlist Bridge.');
      }
    }finally{polling=false;}
  }
  function mount(){
    const root=q('#mainView'),header=root&&root.querySelector('.topbar');
    if(!root||!header||q('#wwV41Ticker'))return;
    const el=document.createElement('div');el.id='wwV41Ticker';el.className='ww-v41-ticker';
    el.innerHTML='<span class="ww-v41-live">STOK</span><div class="ww-v41-ticker-viewport"><div class="ww-v41-ticker-track" id="wwV41TickerTrack"></div></div>';
    header.insertAdjacentElement('afterend',el);
    const btn=document.createElement('button');btn.id='wwV41Sound';btn.type='button';btn.className='ww-v41-sound';
    const actions=header.querySelector('.topbar-actions');
    if(actions){actions.insertBefore(btn,actions.firstChild);btn.addEventListener('click',activateSound);}
    ticker();refreshButton();
    window.addEventListener('wills:stock-v41',ev=>{
      const d=ev.detail||{};setupUser(d.userId);fromBootstrap(d.stock,!!d.stale);setTimeout(poll,2500);
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')poll();});
    setTimeout(poll,6500);setInterval(poll,POLL_MS);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
